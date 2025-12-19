const prisma = require('../../prisma/client');
const { hashPassword, comparePassword } = require('../../utils/password.util');
const { generateToken } = require('../../middlewares/session.middleware');
const { ROLES } = require('../../config/constants');


const loginParticipant = async (teamCode, password) => {
  const team = await prisma.team.findUnique({
    where: { teamCode },
    include: {
      login: true,
      members: true,
    },
  });

  if (!team || !team.login) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await comparePassword(password, team.login.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  if (team.status === 'DISQUALIFIED') {
    throw new Error('Team has been disqualified');
  }

  const token = generateToken({
    teamId: team.id,
    teamCode: team.teamCode,
    role: ROLES.PARTICIPANT,
  });

  return {
    token,
    team: {
      id: team.id,
      teamCode: team.teamCode,
      teamName: team.teamName,
      currentPosition: team.currentPosition,
      currentRoom: team.currentRoom,
      status: team.status,
      members: team.members,
    },
  };
};

const loginAdmin = async (username, password) => {
  const admin = await prisma.adminLogin.findUnique({
    where: { username },
  });

  if (!admin) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await comparePassword(password, admin.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken({
    adminId: admin.id,
    username: admin.username,
    role: ROLES.ADMIN,
  });

  return {
    token,
    admin: {
      id: admin.id,
      username: admin.username,
    },
  };
};

const loginSuperadmin = async (username, password) => {
  const superadmin = await prisma.superAdminLogin.findUnique({
    where: { username },
  });

  if (!superadmin) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await comparePassword(password, superadmin.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken({
    superadminId: superadmin.id,
    username: superadmin.username,
    role: ROLES.SUPERADMIN,
  });

  return {
    token,
    superadmin: {
      id: superadmin.id,
      username: superadmin.username,
    },
  };
};

const createAdmin = async (username, password) => {
  const hashedPassword = await hashPassword(password);

  const admin = await prisma.adminLogin.create({
    data: {
      username,
      password: hashedPassword,
    },
  });

  return {
    id: admin.id,
    username: admin.username,
  };
};

module.exports = {
  loginParticipant,
  loginAdmin,
  loginSuperadmin,
  createAdmin,
};
