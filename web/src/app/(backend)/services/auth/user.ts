import prisma from "../db";

export async function getUserRole(userId: string) {
    if (!userId) return undefined;
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });
    return user?.role;
}

