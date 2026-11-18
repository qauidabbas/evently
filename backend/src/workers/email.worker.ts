import { Worker, Job } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

export const emailWorker = new Worker<EmailJobData>(
  'emailQueue',
  async (job: Job) => {
    console.log(`[Email Worker] Processing job ${job.id}`);
    console.log(`[Email Worker] Sending email to ${job.data.to}`);
    console.log(`[Email Worker] Subject: ${job.data.subject}`);
    
    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    console.log(`[Email Worker] Successfully sent email to ${job.data.to}`);
  },
  { connection }
);

emailWorker.on('completed', (job) => {
  console.log(`[Email Worker] Job ${job.id} has completed!`);
});

emailWorker.on('failed', (job, err) => {
  console.log(`[Email Worker] Job ${job?.id} has failed with ${err.message}`);
});
