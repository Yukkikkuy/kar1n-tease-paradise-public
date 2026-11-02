import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_NODES = [
  {
    id: "node_start",
    title: "醒来",
    steps: [
      {
        id: "s_start_1",
        type: "say",
        text: "你缓缓睁开眼睛。空气里有潮湿的泥土气息，头顶是交错的树影。远处隐约传来水流声。",
      },
      {
        id: "s_start_2",
        type: "say",
        text: "你发现口袋里有一张泛黄的纸条，上面写着：「通往真相的路，从选择开始。」",
      },
    ],
    choices: [
      { id: "c1", text: "沿着水流声走去", targetNodeId: "node_river" },
      { id: "c2", text: "往密林深处探索", targetNodeId: "node_forest" },
    ],
  },
  {
    id: "node_river",
    title: "溪边",
    steps: [
      {
        id: "s_river_1",
        type: "say",
        text: "清澈的溪水绕过卵石。对岸有一座石桥，桥上立着一个披斗篷的人影，似乎在等待什么。",
      },
    ],
    choices: [
      { id: "c3", text: "过桥与对方交谈", targetNodeId: "node_bridge" },
      { id: "c4", text: "沿溪向上游走", targetNodeId: "node_cave" },
      { id: "c5", text: "返回起点", targetNodeId: "node_start" },
    ],
  },
  {
    id: "node_forest",
    title: "密林",
    steps: [
      {
        id: "s_forest_1",
        type: "say",
        text: "树干上刻着奇怪的符号。你蹲下仔细辨认，发现那是一串数字：0427。旁边有个半掩的木箱。",
      },
    ],
    choices: [
      { id: "c6", text: "打开木箱", targetNodeId: "node_chest" },
      { id: "c7", text: "记好数字，回到溪边", targetNodeId: "node_river" },
    ],
  },
  {
    id: "node_bridge",
    title: "桥上的旅人",
    steps: [
      {
        id: "s_bridge_1",
        type: "say",
        text: "斗篷人抬起头：「旅人，你若想离开这片林子，需要一把钥匙。钥匙藏在上游的洞穴里……或者，木箱里也有一条捷径。」",
      },
      {
        id: "s_bridge_2",
        type: "say",
        text: "说完，人影便消散在雾气中。",
      },
    ],
    choices: [
      { id: "c8", text: "前往洞穴", targetNodeId: "node_cave" },
      { id: "c9", text: "去找木箱", targetNodeId: "node_forest" },
    ],
  },
  {
    id: "node_cave",
    title: "洞穴",
    steps: [
      {
        id: "s_cave_1",
        type: "say",
        text: "洞穴深处有一扇铁门，密码锁上闪着绿光。你隐约记得在林子里见过数字……",
      },
    ],
    choices: [
      { id: "c10", text: "输入 0427", targetNodeId: "node_ending_good" },
      { id: "c11", text: "随便试试其他数字", targetNodeId: "node_ending_trap" },
      { id: "c12", text: "先离开洞穴", targetNodeId: "node_river" },
    ],
  },
  {
    id: "node_chest",
    title: "木箱",
    steps: [
      {
        id: "s_chest_1",
        type: "say",
        text: "箱盖弹开，里面是一枚铜钥匙和一张地图碎片。地图指向洞穴出口的另一条路。",
      },
    ],
    choices: [
      { id: "c13", text: "带着钥匙去洞穴", targetNodeId: "node_cave_key" },
      { id: "c14", text: "按地图走捷径", targetNodeId: "node_ending_secret" },
    ],
  },
  {
    id: "node_cave_key",
    title: "洞穴（有钥匙）",
    steps: [
      {
        id: "s_cavekey_1",
        type: "say",
        text: "你用铜钥匙打开了侧门。阳光从出口洒进来——你自由了。",
      },
    ],
    choices: [],
    isEnding: true,
  },
  {
    id: "node_ending_good",
    title: "正确密码",
    steps: [
      {
        id: "s_good_1",
        type: "say",
        text: "铁门缓缓打开。门外是熟悉的小路。你握紧纸条，走出了这片奇异的森林。",
      },
      { id: "s_good_2", type: "say", text: "【好结局】" },
    ],
    choices: [],
    isEnding: true,
  },
  {
    id: "node_ending_trap",
    title: "机关",
    steps: [
      {
        id: "s_trap_1",
        type: "say",
        text: "错误的密码触发了机关！地面塌陷，你坠入黑暗……",
      },
      {
        id: "s_trap_2",
        type: "say",
        text: "（不过别担心，这只是演示结局，刷新即可重来。）",
      },
      { id: "s_trap_3", type: "say", text: "【坏结局】" },
    ],
    choices: [],
    isEnding: true,
  },
  {
    id: "node_ending_secret",
    title: "秘径",
    steps: [
      {
        id: "s_secret_1",
        type: "say",
        text: "捷径通往山顶。你俯瞰整片森林，第一次看清了它的全貌。风很大，也很自由。",
      },
      { id: "s_secret_2", type: "say", text: "【隐藏结局】" },
    ],
    choices: [],
    isEnding: true,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      isAdmin: true,
    },
  });

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      heroTitle: "Kar1n Tease Paradise",
      heroSubtitle: "Kar1n 调教乐园 · 分支剧情文字冒险",
      heroBody: "注册账号后可游玩免费作品；付费作品需使用专属秘钥激活解锁。",
      navBrand: "Kar1n Tease Paradise",
    },
  });
  console.log("Site settings ready (id=default)");

  console.log("Admin user ready:", admin.username, "(change password after first login via /admin/password)");

  // Free demo game
  let freeGame = await prisma.game.findFirst({
    where: { title: "迷失之林（免费试玩）" },
  });
  if (!freeGame) {
    freeGame = await prisma.game.create({
      data: {
        title: "迷失之林（免费试玩）",
        description:
          "一段短小的分支冒险，用来体验游玩与结局。无需秘钥，注册即可游玩。",
        isFree: true,
        published: true,
        startNodeId: "node_start",
        nodesJson: JSON.stringify(DEMO_NODES),
      },
    });
  }

  // Paid locked game (same story for demo)
  let paidGame = await prisma.game.findFirst({
    where: { title: "迷失之林·完整版（需秘钥）" },
  });
  if (!paidGame) {
    paidGame = await prisma.game.create({
      data: {
        title: "迷失之林·完整版（需秘钥）",
        description:
          "与试玩相同的演示剧情，但需要秘钥激活后才能游玩。用于演示付费解锁流程。",
        isFree: false,
        published: true,
        startNodeId: "node_start",
        nodesJson: JSON.stringify(DEMO_NODES),
      },
    });
  }

  // Sample keys for the paid game
  const existing = await prisma.licenseKey.count({
    where: { gameId: paidGame.id },
  });
  if (existing === 0) {
    await prisma.licenseKey.createMany({
      data: [
        {
          code: "DEMO-ONCE-0001-TEST",
          mode: "onetime",
          gameId: paidGame.id,
          note: "演示一次性秘钥（用完失效）",
          createdById: admin.id,
        },
        {
          code: "DEMO-PERM-0001-TEST",
          mode: "permanent",
          gameId: paidGame.id,
          note: "演示永久激活秘钥（绑定账号）",
          createdById: admin.id,
        },
      ],
    });
  }

  console.log("Free game:", freeGame.id);
  console.log("Paid game:", paidGame.id);
  console.log("Demo keys: DEMO-ONCE-0001-TEST / DEMO-PERM-0001-TEST");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
