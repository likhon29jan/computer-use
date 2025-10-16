import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { CoreMessage,ToolCall } from 'ai';
import {
  setupBrowserEnvironment,
  capturePlaywrightScreenshot,
  executePlaywrightAction,
  closeBrowserEnvironment,
  PlaywrightEnvironment,
} from '../environments/playwright';
import { computerTool } from './tool';
import { z } from 'zod';

// Define the schema for the arguments of the computer tool
const computerToolSchema = z.object({
  action: z.enum(['click', 'type', 'scroll', 'keypress', 'wait', 'screenshot']),
  x: z.number().optional(),
  y: z.number().optional(),
  text: z.string().optional(),
  scrollX: z.number().optional(),
  scrollY: z.number().optional(),
  keys: z.array(z.string()).optional(),
});

type ComputerToolParams = z.infer<typeof computerToolSchema>;

async function executeAction(env: PlaywrightEnvironment, toolCall: ToolCall<ComputerToolParams>) {
  if (toolCall.toolName === 'computer') {
    await executePlaywrightAction(env.page, toolCall.args);
  }
}

export async function runAgent(task: string) {
  const env = await setupBrowserEnvironment();

  const messages: CoreMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `You are a computer-using agent. Your task is: ${task}\n\nYou can interact with the computer using these actions:\n- click(x, y): Click at coordinates\n- type(text): Type text\n- scroll(scrollX, scrollY): Scroll the page\n- keypress(keys): Press keyboard keys\n- wait(): Wait for page to load\n\nAnalyze the screenshot and decide the next action to take.`,
        },
        {
          type: 'image',
          image: await capturePlaywrightScreenshot(env.page),
        },
      ],
    },
  ];

  let maxIterations = 10;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`\n=== Iteration ${iteration} ===`);

    const result = await generateText({
      model: google('gemini-2.5-pro'),
      messages,
      tools: {
        computer: computerTool,
      },
    });

    console.log('Model response:', result.text);

    if (result.toolCalls && result.toolCalls.length > 0) {
      const toolCall = result.toolCalls[0] as ToolCall<ComputerToolParams>;

      await executeAction(env, toolCall);

      const screenshot = await capturePlaywrightScreenshot(env.page);

      messages.push({
        role: 'assistant',
        content: result.text,
      });

      messages.push({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: toolCall.id,
            toolName: 'computer',
            result: 'Action executed successfully',
          },
          {
            type: 'image',
            image: screenshot,
          },
        ],
      });
    } else {
      console.log('Task completed or model responded with text only');
      break;
    }

    if (
      result.text &&
      (result.text.toLowerCase().includes('task complete') ||
        result.text.toLowerCase().includes('finished'))
    ) {
      console.log('Task completed successfully!');
      break;
    }
  }

  await closeBrowserEnvironment(env.browser);
}