import Stripe from "stripe";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireMembership, ensureAdminOrOwner, ApiError } from "@/lib/auth";

type PortalRequest = {
  organizationId: string;
};

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new ApiError(500, "STRIPE_SECRET_KEY is not configured", "STRIPE_NOT_CONFIGURED");
  }
  return new Stripe(secretKey, { apiVersion: "2024-06-20" });
}

function getBaseUrl(request: Request) {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase && envBase.trim().length > 0) return envBase;
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return host ? `${proto}://${host}` : "http://localhost:5100";
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const body = (await request.json()) as PortalRequest;
    if (!body?.organizationId) {
      throw new ApiError(400, "organizationId is required", "INVALID_REQUEST");
    }

    const membership = await requireMembership(auth.user.id, body.organizationId);
    ensureAdminOrOwner(membership.role);

    const org = await prisma.organization.findUnique({
      where: { id: body.organizationId },
      select: { id: true, stripeCustomerId: true },
    });
    if (!org) {
      throw new ApiError(404, "organization not found", "ORG_NOT_FOUND");
    }
    if (!org.stripeCustomerId) {
      throw new ApiError(400, "stripe customer is not configured", "STRIPE_CUSTOMER_MISSING");
    }

    const stripe = getStripe();
    const baseUrl = getBaseUrl(request);
    const portal = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${baseUrl}/organizations/${org.id}/settings`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("POST /api/stripe/portal failed", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}
