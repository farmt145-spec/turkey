import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Predefiniowane workflowy
  await prisma.workflow.create({
    data: {
      name: 'Alarm temperatury > 30°C',
      description: 'Wysyła alarm gdy temperatura przekroczy 30°C',
      priority: 10,
      createdBy: 'system',
      triggers: {
        create: [{
          type: 'THRESHOLD',
          sourceModule: 'IOT',
          conditionJson: { field: 'temperature', operator: 'GT', value: 30 },
        }],
      },
      actions: {
        create: [{
          type: 'CREATE_ALERT',
          targetModule: 'SYSTEM',
          configJson: {
            title: 'Wysoka temperatura w kurniku',
            bodyTemplate: 'Temperatura osiągnęła {{temperature}}°C',
            channel: 'PUSH',
            recipient: 'admin',
            severity: 'HIGH',
          },
          orderIndex: 0,
        }],
      },
    },
  });

  await prisma.workflow.create({
    data: {
      name: 'FCR przekroczony – zadanie dla zootechnika',
      description: 'Tworzy zadanie gdy FCR przekroczy normę',
      priority: 8,
      createdBy: 'system',
      triggers: {
        create: [{
          type: 'THRESHOLD',
          sourceModule: 'FEEDING',
          conditionJson: { field: 'fcr', operator: 'GT', value: 2.0 },
        }],
      },
      actions: {
        create: [{
          type: 'CREATE_TASK',
          targetModule: 'HEALTH',
          configJson: {
            title: 'Kontrola FCR – przekroczenie normy',
            description: 'FCR wynosi {{fcr}}, co przekracza dopuszczalną normę.',
            priority: 'HIGH',
            assignedTo: 'zootechnik',
            dueHours: 4,
          },
          orderIndex: 0,
        }],
      },
    },
  });

  await prisma.workflow.create({
    data: {
      name: 'Niski stan paszy',
      description: 'Przygotowuje zamówienie gdy paszy starczy na < 3 dni',
      priority: 7,
      createdBy: 'system',
      triggers: {
        create: [{
          type: 'THRESHOLD',
          sourceModule: 'WAREHOUSE',
          conditionJson: { field: 'feedDaysLeft', operator: 'LT', value: 3 },
        }],
      },
      actions: {
        create: [
          {
            type: 'CREATE_TASK',
            targetModule: 'WAREHOUSE',
            configJson: {
              title: 'Przygotuj zamówienie paszy',
              description: 'Pozostało {{feedDaysLeft}} dni paszy.',
              priority: 'MEDIUM',
              assignedTo: 'magazynier',
            },
            orderIndex: 0,
          },
          {
            type: 'SEND_NOTIFICATION',
            targetModule: 'ECONOMY',
            configJson: {
              title: 'Planowane zamówienie paszy',
              bodyTemplate: 'Zapas paszy: {{feedDaysLeft}} dni.',
              channel: 'EMAIL',
              recipient: 'procurement@farm.pl',
            },
            orderIndex: 1,
          },
        ],
      },
    },
  });

  // Predefiniowane harmonogramy
  const schedules = [
    { name: 'Planowanie szczepień', cronExpression: '0 6 * * 1', workflowId: null },
    { name: 'Planowanie ważenia', cronExpression: '0 6 * * 3', workflowId: null },
    { name: 'Przypomnienie o myciu', cronExpression: '0 18 * * 5', workflowId: null },
    { name: 'Harmonogram dostaw', cronExpression: '0 7 * * *', workflowId: null },
    { name: 'Raport dzienny', cronExpression: '0 23 * * *', workflowId: null },
    { name: 'Raport tygodniowy', cronExpression: '0 8 * * 1', workflowId: null },
    { name: 'Raport miesięczny', cronExpression: '0 8 1 * *', workflowId: null },
  ];

  for (const s of schedules) {
    await prisma.scheduledTask.create({ data: s });
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
