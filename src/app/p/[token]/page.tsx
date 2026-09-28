import { redirect } from "next/navigation";

// Old tokenised public links now point at the fixed /bookings address.
export default async function LegacyPublicLink({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  redirect(m ? `/bookings?m=${encodeURIComponent(m)}` : "/bookings");
}
