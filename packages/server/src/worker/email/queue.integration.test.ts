/**
 * Bull Queue integration tests
 *
 * Tests email queue operations with real Redis and Bull
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import Bull, { Queue, Job } from "bull";

describe("Bull Queue Integration Tests", () => {
    let container: StartedTestContainer;
    let redisHost: string;
    let redisPort: number;
    let emailQueue: Queue;

    beforeAll(async () => {
        // Start Redis container for Bull
        container = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();

        redisHost = container.getHost();
        redisPort = container.getMappedPort(6379);

        console.log(`Test Redis for Bull started: ${redisHost}:${redisPort}`);

        // Create email queue
        emailQueue = new Bull("test-email-queue", {
            redis: {
                host: redisHost,
                port: redisPort,
            },
        });

        // Wait for queue to be ready
        await emailQueue.isReady();
    }, 60000);

    afterAll(async () => {
        if (emailQueue) {
            await emailQueue.close();
        }
        if (container) {
            await container.stop();
            console.log("Test Redis stopped");
        }
    });

    beforeEach(async () => {
        // Close and recreate queue to prevent "Cannot define the same handler twice" error
        if (emailQueue) {
            await emailQueue.close();
        }

        // Use unique queue name per test to avoid job persistence issues
        const queueName = `test-email-queue-${Date.now()}-${Math.random()}`;
        emailQueue = new Bull(queueName, {
            redis: {
                host: redisHost,
                port: redisPort,
            },
        });

        await emailQueue.isReady();
    });

    describe("Queue Operations", () => {
        it("should add job to queue", async () => {
            const job = await emailQueue.add({
                to: ["test@example.com"],
                subject: "Test Email",
                text: "This is a test",
                html: "<p>This is a test</p>",
            });

            expect(job).toBeDefined();
            expect(job.id).toBeDefined();
            expect(job.data).toHaveProperty("to");
            expect(job.data.to).toContain("test@example.com");
        });

        it("should get job from queue", async () => {
            const job = await emailQueue.add({
                to: ["retrieve@example.com"],
                subject: "Retrieve Test",
            });

            const retrievedJob = await emailQueue.getJob(job.id);

            expect(retrievedJob).toBeDefined();
            expect(retrievedJob?.id).toBe(job.id);
            expect(retrievedJob?.data.to).toContain("retrieve@example.com");
        });

        it("should add multiple jobs", async () => {
            await emailQueue.add({ to: ["user1@example.com"], subject: "Email 1" });
            await emailQueue.add({ to: ["user2@example.com"], subject: "Email 2" });
            await emailQueue.add({ to: ["user3@example.com"], subject: "Email 3" });

            const count = await emailQueue.getJobCounts();
            expect(count.waiting).toBe(3);
        });

        it("should process jobs in order (FIFO)", async () => {
            const processed: string[] = [];

            emailQueue.process(async (job: Job) => {
                processed.push(job.data.order);
                return { success: true };
            });

            await emailQueue.add({ order: "first", to: ["test@example.com"] });
            await emailQueue.add({ order: "second", to: ["test@example.com"] });
            await emailQueue.add({ order: "third", to: ["test@example.com"] });

            // Wait for processing
            await new Promise((resolve) => setTimeout(resolve, 1000));

            expect(processed).toEqual(["first", "second", "third"]);
        });
    });

    describe("Job Status and Lifecycle", () => {
        it("should track job progress", async () => {
            emailQueue.process(async (job: Job) => {
                await job.progress(50);
                await new Promise((resolve) => setTimeout(resolve, 100));
                await job.progress(100);
                return { success: true };
            });

            const job = await emailQueue.add({
                to: ["progress@example.com"],
                subject: "Progress Test",
            });

            // Wait for processing
            await job.finished();

            const completedJob = await emailQueue.getJob(job.id);
            expect(completedJob?.progress()).toBe(100);
        });

        it("should mark job as completed", async () => {
            emailQueue.process(async (job: Job) => {
                return { sent: true, messageId: "test-message-id" };
            });

            const job = await emailQueue.add({
                to: ["complete@example.com"],
                subject: "Completion Test",
            });

            const result = await job.finished();

            expect(result).toHaveProperty("sent", true);
            expect(result).toHaveProperty("messageId");

            const completedJob = await emailQueue.getJob(job.id);
            expect(await completedJob?.isCompleted()).toBe(true);
        });

        it("should mark job as failed on error", async () => {
            emailQueue.process(async (job: Job) => {
                throw new Error("Email sending failed");
            });

            const job = await emailQueue.add({
                to: ["fail@example.com"],
                subject: "Failure Test",
            });

            try {
                await job.finished();
            } catch (error) {
                // Expected to fail
            }

            // Wait a bit for job to be marked as failed
            await new Promise((resolve) => setTimeout(resolve, 500));

            const failedJob = await emailQueue.getJob(job.id);
            expect(await failedJob?.isFailed()).toBe(true);
        });
    });

    describe("Job Options", () => {
        it("should add job with delay", async () => {
            const job = await emailQueue.add(
                {
                    to: ["delayed@example.com"],
                    subject: "Delayed Email",
                },
                {
                    delay: 2000, // 2 second delay
                }
            );

            expect(job.opts.delay).toBe(2000);

            const state = await job.getState();
            expect(state).toBe("delayed");
        });

        it("should add job with priority", async () => {
            const highPriority = await emailQueue.add(
                {
                    to: ["high@example.com"],
                    subject: "High Priority",
                },
                {
                    priority: 1,
                }
            );

            const lowPriority = await emailQueue.add(
                {
                    to: ["low@example.com"],
                    subject: "Low Priority",
                },
                {
                    priority: 10,
                }
            );

            expect(highPriority.opts.priority).toBe(1);
            expect(lowPriority.opts.priority).toBe(10);
        });

        it("should retry failed jobs", async () => {
            let attempts = 0;

            emailQueue.process(async (job: Job) => {
                attempts++;
                if (attempts < 3) {
                    throw new Error("Simulated failure");
                }
                return { success: true, attempts };
            });

            const job = await emailQueue.add(
                {
                    to: ["retry@example.com"],
                    subject: "Retry Test",
                },
                {
                    attempts: 3,
                    backoff: {
                        type: "fixed",
                        delay: 100,
                    },
                }
            );

            const result = await job.finished();

            expect(result.success).toBe(true);
            expect(result.attempts).toBe(3);
        });

        it("should remove job on completion", async () => {
            emailQueue.process(async (job: Job) => {
                return { success: true };
            });

            const job = await emailQueue.add(
                {
                    to: ["remove@example.com"],
                    subject: "Remove on Complete",
                },
                {
                    removeOnComplete: true,
                }
            );

            await job.finished();

            // Wait a bit for removal
            await new Promise((resolve) => setTimeout(resolve, 500));

            const retrievedJob = await emailQueue.getJob(job.id);
            expect(retrievedJob).toBeNull();
        });
    });

    describe("Queue Events", () => {
        it("should emit completed event", async () => {
            let completedJobId: string | undefined;

            emailQueue.on("completed", (job: Job) => {
                completedJobId = job.id?.toString();
            });

            emailQueue.process(async (job: Job) => {
                return { success: true };
            });

            const job = await emailQueue.add({
                to: ["event@example.com"],
                subject: "Event Test",
            });

            await job.finished();

            expect(completedJobId).toBe(job.id?.toString());
        });

        it("should emit failed event", async () => {
            let failedJobId: string | undefined;
            let failedError: Error | undefined;

            emailQueue.on("failed", (job: Job, err: Error) => {
                failedJobId = job.id?.toString();
                failedError = err;
            });

            emailQueue.process(async (job: Job) => {
                throw new Error("Test error");
            });

            const job = await emailQueue.add({
                to: ["fail-event@example.com"],
                subject: "Fail Event Test",
            });

            try {
                await job.finished();
            } catch (error) {
                // Expected
            }

            await new Promise((resolve) => setTimeout(resolve, 500));

            expect(failedJobId).toBe(job.id?.toString());
            expect(failedError?.message).toBe("Test error");
        });
    });

    describe("Queue Management", () => {
        it("should get job counts by status", async () => {
            emailQueue.process(async (job: Job) => {
                await new Promise((resolve) => setTimeout(resolve, 500));
                return { success: true };
            });

            // Add jobs
            await emailQueue.add({ to: ["1@example.com"], subject: "Test 1" });
            await emailQueue.add({ to: ["2@example.com"], subject: "Test 2" });
            await emailQueue.add({ to: ["3@example.com"], subject: "Test 3" });

            const counts = await emailQueue.getJobCounts();

            expect(counts).toHaveProperty("waiting");
            expect(counts).toHaveProperty("active");
            expect(counts).toHaveProperty("completed");
            expect(counts).toHaveProperty("failed");
        });

        it("should pause and resume queue", async () => {
            await emailQueue.pause();

            const isPaused = await emailQueue.isPaused();
            expect(isPaused).toBe(true);

            await emailQueue.add({ to: ["pause@example.com"], subject: "Paused" });

            // Job should not process while paused
            await new Promise((resolve) => setTimeout(resolve, 500));

            const counts = await emailQueue.getJobCounts();
            // Check waiting or delayed, as jobs might be in either state when paused
            expect(counts.waiting + counts.delayed).toBeGreaterThan(0);

            await emailQueue.resume();

            const isResumed = !(await emailQueue.isPaused());
            expect(isResumed).toBe(true);
        });

        it("should clean old jobs", async () => {
            emailQueue.process(async (job: Job) => {
                return { success: true };
            });

            // Add and complete jobs
            const job1 = await emailQueue.add({ to: ["old1@example.com"], subject: "Old 1" });
            const job2 = await emailQueue.add({ to: ["old2@example.com"], subject: "Old 2" });

            await job1.finished();
            await job2.finished();

            // Clean completed jobs older than 0ms (all of them)
            const cleaned = await emailQueue.clean(0, "completed");

            expect(cleaned.length).toBeGreaterThan(0);
        });

        it("should get all jobs in queue", async () => {
            await emailQueue.add({ to: ["list1@example.com"], subject: "List 1" });
            await emailQueue.add({ to: ["list2@example.com"], subject: "List 2" });

            const jobs = await emailQueue.getJobs(["waiting"]);

            expect(jobs.length).toBe(2);
            expect(jobs[0].data).toHaveProperty("to");
        });
    });

    describe("Email Queue Specific Tests", () => {
        it("should queue email with all required fields", async () => {
            const emailData = {
                to: ["recipient@example.com"],
                subject: "Welcome Email",
                text: "Welcome to our service!",
                html: "<h1>Welcome to our service!</h1>",
            };

            const job = await emailQueue.add(emailData);

            expect(job.data.to).toEqual(emailData.to);
            expect(job.data.subject).toBe(emailData.subject);
            expect(job.data.text).toBe(emailData.text);
            expect(job.data.html).toBe(emailData.html);
        });

        it("should queue email with multiple recipients", async () => {
            const job = await emailQueue.add({
                to: ["user1@example.com", "user2@example.com", "user3@example.com"],
                subject: "Newsletter",
                text: "Monthly newsletter",
                html: "<p>Monthly newsletter</p>",
            });

            expect(job.data.to).toHaveLength(3);
        });

        it("should process verification email", async () => {
            emailQueue.process(async (job: Job) => {
                const { to, subject } = job.data;
                expect(subject).toContain("Verify");
                return { sent: true };
            });

            const job = await emailQueue.add({
                to: ["newuser@example.com"],
                subject: "Verify Account",
                text: "Click link to verify",
                html: '<a href="#">Verify Account</a>',
            });

            const result = await job.finished();
            expect(result.sent).toBe(true);
        });

        it("should process password reset email", async () => {
            emailQueue.process(async (job: Job) => {
                const { to, subject } = job.data;
                expect(subject).toContain("Password Reset");
                return { sent: true };
            });

            const job = await emailQueue.add({
                to: ["reset@example.com"],
                subject: "Password Reset",
                text: "Reset your password",
                html: '<a href="#">Reset Password</a>',
            });

            const result = await job.finished();
            expect(result.sent).toBe(true);
        });
    });

    describe("Error Handling and Edge Cases", () => {
        it("should handle empty recipients array", async () => {
            const job = await emailQueue.add({
                to: [],
                subject: "No recipients",
                text: "This should not be sent",
            });

            expect(job.data.to).toEqual([]);
        });

        it("should handle job timeout", async () => {
            emailQueue.process(async (job: Job) => {
                // Simulate long-running task
                await new Promise((resolve) => setTimeout(resolve, 5000));
                return { success: true };
            });

            const job = await emailQueue.add(
                {
                    to: ["timeout@example.com"],
                    subject: "Timeout Test",
                },
                {
                    timeout: 1000, // 1 second timeout
                }
            );

            try {
                await job.finished();
            } catch (error: any) {
                // Bull wraps timeout errors - check for common timeout-related words
                expect(error.message.toLowerCase()).toMatch(/timeout|timed out/);
            }
        }, 10000);

        it("should handle concurrent job processing", async () => {
            const processed: string[] = [];

            emailQueue.process(3, async (job: Job) => {
                processed.push(job.data.id);
                await new Promise((resolve) => setTimeout(resolve, 200));
                return { success: true };
            });

            // Add multiple jobs
            await Promise.all([
                emailQueue.add({ id: "1", to: ["test@example.com"], subject: "Test 1" }),
                emailQueue.add({ id: "2", to: ["test@example.com"], subject: "Test 2" }),
                emailQueue.add({ id: "3", to: ["test@example.com"], subject: "Test 3" }),
                emailQueue.add({ id: "4", to: ["test@example.com"], subject: "Test 4" }),
                emailQueue.add({ id: "5", to: ["test@example.com"], subject: "Test 5" }),
            ]);

            // Wait for all jobs to complete
            await new Promise((resolve) => setTimeout(resolve, 2000));

            expect(processed).toHaveLength(5);
        });
    });
});
