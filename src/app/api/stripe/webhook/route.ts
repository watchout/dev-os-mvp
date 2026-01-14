import Stripe from "stripe";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PlanType } from "@/generated/prisma";

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey, { apiVersion: "2024-06-20" });
}

async function resolveAuditUserId(organizationId: string): Promise<string | null> {
  const owner = await prisma.organizationMember.findFirst({
    where: { organizationId, role: "owner" },
    select: { userId: true },
  });
  if (owner) return owner.userId;
  const admin = await prisma.organizationMember.findFirst({
    where: { organizationId, role: "admin" },
    select: { userId: true },
  });
  if (admin) return admin.userId;
  const anyMember = await prisma.organizationMember.findFirst({
    where: { organizationId },
    select: { userId: true },
  });
  return anyMember?.userId ?? null;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "missing stripe signature/secret" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organizationId;
      const planId = session.metadata?.planId as PlanType | undefined;
      const initiatedByUserId = session.metadata?.initiatedByUserId;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
      const customerId = typeof session.customer === "string" ? session.customer : null;

      if (!organizationId || !planId || !Object.values(PlanType).includes(planId)) {
        console.warn("checkout.session.completed missing metadata", session.id);
        return NextResponse.json({ received: true });
      }

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          planId,
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId ?? undefined,
        },
      });

      const userId = initiatedByUserId || (await resolveAuditUserId(organizationId));
      if (userId) {
        await prisma.auditLog.create({
          data: {
            organizationId,
            userId,
            action: "PLAN_UPGRADED",
            resourceType: "organization",
            resourceId: organizationId,
            metadata: {
              planId,
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: customerId,
              stripeSessionId: session.id,
            },
          },
        });
      } else {
        console.warn("AuditLog skipped: userId not found for organization", organizationId);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

      const org = await prisma.organization.findFirst({
        where: {
          OR: [
            { stripeSubscriptionId: subscriptionId },
            ...(customerId ? [{ stripeCustomerId: customerId }] : []),
          ],
        },
        select: { id: true },
      });

      if (!org) {
        console.warn("subscription.deleted: organization not found", subscriptionId);
        return NextResponse.json({ received: true });
      }

      await prisma.organization.update({
        where: { id: org.id },
        data: {
          planId: PlanType.free,
          stripeSubscriptionId: null,
        },
      });

      const userId = await resolveAuditUserId(org.id);
      if (userId) {
        await prisma.auditLog.create({
          data: {
            organizationId: org.id,
            userId,
            action: "PLAN_DOWNGRADED",
            resourceType: "organization",
            resourceId: org.id,
            metadata: {
              planId: PlanType.free,
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: customerId,
            },
          },
        });
      } else {
        console.warn("AuditLog skipped: userId not found for organization", org.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook handler failed", err);
    return NextResponse.json({ error: "webhook_handler_failed" }, { status: 500 });
  }
}
