import prisma from '../../../shared/prisma';

const getAllUsersFromDB = async (page: number = 1, limit: number = 20) => {
  const totalUsers = await prisma.user.count({});
  const activeUsers = await prisma.user.count({
    where: {
      status: 'ACTIVE',
    },
  });

  const totalPages = Math.ceil(totalUsers / limit);

  const users = await prisma.user.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
      maritalStatus: true,
      religion: true,
      nickname: true,
      profileImage: true,
      addresses: {
        select: {
          country: true,
        },
      },
    },
  });

  return {
    meta: {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      totalPages,
      currentPage: page,
    },
    users: users.map(user => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      status: user.status,
      maritalStatus: user.maritalStatus,
      religion: user.religion,
      nickname: user.nickname,
      profileImage: user.profileImage,
      addresses: user.addresses[0],
    })),
  };
};

const getUserDetailsFromDB = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      nickname: true,
      maritalStatus: true,
      religion: true,
      status: true,
      addresses: {
        select: {
          country: true,
        },
      },
    },
  });
  return {
    id: user?.id,
    fullName: user?.fullName,
    email: user?.email,
    profileImage: user?.profileImage,
    nickname: user?.nickname,
    maritalStatus: user?.maritalStatus,
    religion: user?.religion,
    status: user?.status,
    addresses: user?.addresses[0],
  };
};

const deleteUserFromDB = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'DELETED',
    },
  });

  return;
};

const getAllSubscriptionsFromDB = async (
  page: number = 1,
  limit: number = 20,
) => {
  const totalSubscriptions = await prisma.payment.count();
  const totalEssentialWill = await prisma.payment.count({
    where: { productId: 'essential_will' },
   
  });
  const totalUnlimitedLegacy = await prisma.payment.count({
    where: { productId: 'unlimited_legacy' },
  
  });

  const totalPages = Math.ceil(totalSubscriptions / limit);

  const subscriptions = await prisma.payment.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      amount: true,
      productId: true,
      createdAt: true,
      status: true,
      user: {
        select: {
          profileImage: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  return {
    meta: {
      totalSubscriptions,
      totalEssentialWill,
      totalUnlimitedLegacy,
      totalPages,
      currentPage: page,
    },
    subscriptions,
  };
};

export const adminService = {
  getAllUsersFromDB,
  getUserDetailsFromDB,
  deleteUserFromDB,
  getAllSubscriptionsFromDB,
};
