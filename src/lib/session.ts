import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function getBusinessProfile(userId: string) {
  let profile = await prisma.businessProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.businessProfile.create({ data: { userId } });
  }
  return profile;
}
