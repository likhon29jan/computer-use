import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DockerEnvironment {
  containerName: string;
  display: string;
}

export async function setupDockerEnvironment(): Promise<DockerEnvironment> {
  const containerName = 'cua-agent';
  const display = ':99';

  await execAsync(`docker build -t cua-desktop-image .`);
  await execAsync(`docker run -d \\
    --name ${containerName} \\
    -e DISPLAY=${display} \\
    --shm-size=2gb \\
    cua-desktop-image`);

  return { containerName, display };
}

export async function executeDockerAction(vm: DockerEnvironment, action: any) {
  const { containerName, display } = vm;

  switch (action.action) {
    case 'click':
      const buttonMap: { [key: string]: number } = { left: 1, middle: 2, right: 3 };
      const button = buttonMap[action.button] || 1;
      await execAsync(
        `docker exec ${containerName} sh -c "DISPLAY=${display} xdotool mousemove ${action.x} ${action.y} click ${button}"`
      );
      break;

    case 'type':
      await execAsync(
        `docker exec ${containerName} sh -c "DISPLAY=${display} xdotool type '${action.text}'"`
      );
      break;

    case 'scroll':
        await execAsync(
            `docker exec ${containerName} sh -c "DISPLAY=${display} xdotool mousemove ${action.x} ${action.y}"`
          );

          if (action.scrollY !== 0) {
            const scrollButton = action.scrollY < 0 ? 4 : 5;
            const clicks = Math.abs(action.scrollY);
            for (let i = 0; i < clicks; i++) {
              await execAsync(
                `docker exec ${containerName} sh -c "DISPLAY=${display} xdotool click ${scrollButton}"`
              );
            }
          }
      break;

    case 'keypress':
      for (const key of action.keys) {
        await execAsync(
          `docker exec ${containerName} sh -c "DISPLAY=${display} xdotool key '${key}'"`
        );
      }
      break;

    case 'wait':
      await new Promise(resolve => setTimeout(resolve, 2000));
      break;
  }
}

export async function captureDockerScreenshot(vm: DockerEnvironment): Promise<string> {
  const { containerName, display } = vm;
  const { stdout } = await execAsync(
    `docker exec ${containerName} sh -c "DISPLAY=${display} import -window root png:-" | base64`
  );
  return stdout.trim();
}

export async function closeDockerEnvironment(containerName: string): Promise<void> {
  await execAsync(`docker stop ${containerName} && docker rm ${containerName}`);
}