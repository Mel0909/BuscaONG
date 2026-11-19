import prisma from "../db";

export async function getUserRole(userId: string) {
    if (!userId) return [];
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });
    return user?.role;
}

