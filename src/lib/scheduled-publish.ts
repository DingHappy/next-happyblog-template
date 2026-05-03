import prisma from '@/lib/prisma';

export async function publishDuePosts(now = new Date()) {
  const postsToPublish = await prisma.post.findMany({
    where: {
      scheduledAt: { lte: now },
      published: false,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (postsToPublish.length === 0) {
    return {
      count: 0,
      posts: [],
    };
  }

  const result = await prisma.post.updateMany({
    where: {
      id: {
        in: postsToPublish.map((post) => post.id),
      },
    },
    data: {
      published: true,
      scheduledAt: null,
    },
  });

  return {
    count: result.count,
    posts: postsToPublish,
  };
}
