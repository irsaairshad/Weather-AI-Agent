const API_URL = "";

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function getWeather(city: string) {
  let response: Response;

  try {
    response = await fetch(
      `${API_URL}/api/weather?city=${encodeURIComponent(city)}`,
    );
  } catch {
    throw new Error("Could not connect to the weather service.");
  }

  if (!response.ok) {
    let message = "Weather service is unavailable.";

    try {
      const errorData = await response.json();

      if (errorData.detail) {
        message = String(errorData.detail);
      }
    } catch {
      // Keep the default message if the response is not JSON.
    }

    throw new Error(message);
  }

  return response.json();
}

/**
 * Send a message and process newline-delimited streaming JSON.
 */
export async function streamChat(
  message: string,
  city: string,
  history: ChatHistoryMessage[],
  onToken: (text: string) => void,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        city,
        history: history.slice(-6),
      }),
    });
  } catch {
    throw new Error("Could not connect to Nimbus.");
  }

  if (!response.ok) {
    let message = `Assistant request failed (${response.status}).`;

    try {
      const errorData = await response.json();

      if (errorData.detail) {
        message = String(errorData.detail);
      }
    } catch {
      // Keep the status-based error message.
    }

    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("The assistant returned an empty response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      buffer += decoder.decode();
      break;
    }

    buffer += decoder.decode(value, {
      stream: true,
    });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      processStreamLine(line, onToken);
    }
  }

  // Process any final event without a trailing newline.
  if (buffer.trim()) {
    processStreamLine(buffer, onToken);
  }
}

function processStreamLine(
  line: string,
  onToken: (text: string) => void,
): void {
  if (!line.trim()) return;

  let event: {
    token?: unknown;
    error?: unknown;
    done?: boolean;
  };

  try {
    event = JSON.parse(line);
  } catch {
    throw new Error("Nimbus returned an invalid streaming response.");
  }

  if (typeof event.token === "string") {
    onToken(event.token);
  }

  if (event.error) {
    throw new Error(String(event.error));
  }
}