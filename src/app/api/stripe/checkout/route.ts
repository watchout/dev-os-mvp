import Stripe from "stripe";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireMembership, ensureAdminOrOwner, ApiError } from "@/lib/auth";

type CheckoutRequest = {
  organizationId: string;
  planId: "pro" | "team";
  billingInterval: "monthly" | "annual";
};

function getBaseUrl(request: Request) {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase && envBase.trim().length > 0) return envBase;
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return host ? `${proto}://${host}` : "http://localhost:5100";
}

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new ApiError(500, "STRIPE_SECRET_KEY is not configured", "STRIPE_NOT_CONFIGURED");
  }
  return new Stripe(secretKey, { apiVersion: "2024-06-20" });
}

function resolvePriceId(planId: CheckoutRequest["planId"], billingInterval: CheckoutRequest["billingInterval"]) {
  const map = {
    pro: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
      annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
    },
    team: {
      monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY,
      annual: process.env.STRIPE_PRICE_TEAM_ANNUAL,
    },
  } as const;
  const priceId = map[planId]?.[billingInterval];
  if (!priceId) {
    throw new ApiError(500, "Stripe price id is not configured", "STRIPE_PRICE_MISSING");
  }
  return priceId;
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const { user } = auth;
    const body = (await request.json()) as CheckoutRequest;

    if (!body?.organizationId || !body?.planId || !body?.billingInterval) {
      throw new ApiError(400, "organizationId/planId/billingInterval are required", "INVALID_REQUEST");
    }
    if (body.planId !== "pro" && body.planId !== "team") {
      throw new ApiError(400, "invalid planId", "INVALID_PLAN");
    }
    if (body.billingInterval !== "monthly" && body.billingInterval !== "annual") {
      throw new ApiError(400, "invalid billingInterval", "INVALID_INTERVAL");
    }

    const membership = await requireMembership(user.id, body.organizationId);
    ensureAdminOrOwner(membership.role);

    const org = await prisma.organization.findUnique({
      where: { id: body.organizationId },
      select: { id: true, name: true, planId: true, stripeCustomerId: true },
    });
    if (!org) {
      throw new ApiError(404, "organization not found", "ORG_NOT_FOUND");
    }
    if (org.planId === "team" || org.planId === "enterprise") {
      throw new ApiError(400, "current plan cannot be upgraded via checkout", "INVALID_PLAN_STATE");
    }
    if (org.planId === body.planId) {
      throw new ApiError(400, "already on the selected plan", "ALREADY_ON_PLAN");
    }

    const stripe = getStripe();
    let stripeCustomerId = org.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        email: user.email ?? undefined,
        metadata: { organizationId: org.id },
      });
      stripeCustomerId = customer.id;
      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId },
      });
    }

    const priceId = resolvePriceId(body.planId, body.billingInterval);
    const baseUrl = getBaseUrl(request);
    const successUrl = `${baseUrl}/organizations/${org.id}/settings?upgrade=success`;
    const cancelUrl = `${baseUrl}/organizations/${org.id}/settings?upgrade=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        organizationId: org.id,
        planId: body.planId,
        billingInterval: body.billingInterval,
        initiatedByUserId: user.id,
      },
      subscription_data: {
        metadata: {
          organizationId: org.id,
          planId: body.planId,
          billingInterval: body.billingInterval,
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: "PLAN_UPGRADE_STARTED",
        resourceType: "organization",
        resourceId: org.id,
        metadata: {
          planId: body.planId,
          billingInterval: body.billingInterval,
          stripeCustomerId,
          stripeSessionId: session.id,
        },
      },
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("POST /api/stripe/checkout failed", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}
