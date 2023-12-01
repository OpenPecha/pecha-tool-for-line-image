const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const deletedUser = await prisma.user.deleteMany({});

  const deleteGroup = await prisma.group.deleteMany({});

  const group = await prisma.group.create({
    data: {
      name: "Group 1",
      users: {
        createMany: {
          data: [
            { name: "user1", role: "TRANSCRIBER", email: "user1@gmail.com" },
            { name: "user2", role: "TRANSCRIBER", email: "user2@gmail.com" },
            { name: "user3", role: "REVIEWER", email: "user3@gmail.com" },
          ],
        },
      },
    },
  });

  const task = await prisma.task.createMany({
    data: [
      {
        group_id: group.id,
        inference_transcript: "This is a sample transcript",
        url: "https://picsum.photos/id/0/5000/3333",
        file_name: "photo-1.jpg",
      },
      {
        group_id: group.id,
        inference_transcript: "This is another sample transcript",
        url: "https://picsum.photos/id/9/5000/3269",
        file_name: "photo-2.jpg",
      },
      {
        group_id: group.id,
        inference_transcript: "This is a third sample transcript",
        url: "https://picsum.photos/id/10/2500/1667",
        file_name: "photo-3.jpg",
      },
      {
        group_id: group.id,
        inference_transcript: "This is a fourth sample transcript",
        url: "https://picsum.photos/id/100/2500/1667",
        file_name: "photo-4.jpg",
      },
      {
        group_id: group.id,
        inference_transcript: "This is a fifth sample transcript",
        url: "https://picsum.photos/id/1000/5626/3635",
        file_name: "photo-5.jpg",
      },
      {
        group_id: group.id,
        inference_transcript: "This is a sixth sample transcript",
        url: "https://picsum.photos/id/1001/5616/3744",
        file_name: "photo-6.jpg",
      },
      {
        group_id: group.id,
        inference_transcript: "This is a seventh sample transcript",
        url: "https://picsum.photos/id/1002/4312/2868",
        file_name: "photo-7.jpg",
      },
      {
        group_id: group.id,
        inference_transcript: "This is a eighth sample transcript",
        url: "https://picsum.photos/id/1003/1181/1772",
        file_name: "photo-8.jpg",
      },
      {
        group_id: group.id,
        inference_transcript: "This is a ninth sample transcript",
        url: "https://picsum.photos/id/1004/5616/3744",
        file_name: "photo-9.jpg",
      },
      {
        group_id: group.id,
        inference_transcript: "This is a tenth sample transcript",
        url: "https://picsum.photos/id/1005/5760/3840",
        file_name: "photo-10.jpg",
      },
      {
        group_id: group.id,
        inference_transcript: "This is a eleventh sample transcript",
        url: "https://picsum.photos/id/1006/3000/2000",
        file_name: "photo-11.jpg",
      },
      {
        group_id: group.id,
        inference_transcript: "This is a twelfth sample transcript",
        url: "https://picsum.photos/id/1008/5616/3744",
        file_name: "photo-12.jpg",
      },
      {
        group_id: group.id,
        inference_transcript: "This is a thirteenth sample transcript",
        url: "https://picsum.photos/id/1009/5000/7502",
        file_name: "photo-13.jpg",
      },
      {
        group_id: group.id,
        inference_transcript: "This is a fourteenth sample transcript",
        url: "https://picsum.photos/id/101/2621/1747",
        file_name: "photo-14.jpg",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
