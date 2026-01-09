import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

// Convert OpenAI-style messages to Gemini format
type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
};

function convertToGeminiFormat(messages: Message[]): { systemInstruction?: { parts: { text: string }[] }; contents: GeminiContent[] } {
  let systemInstruction: { parts: { text: string }[] } | undefined;
  const contents: GeminiContent[] = [];

  for (const message of messages) {
    const contentParts = ensureArray(message.content).map(normalizeContentPart);
    
    if (message.role === "system") {
      // Gemini uses systemInstruction for system messages
      const textParts = contentParts
        .filter((p): p is TextContent => p.type === "text")
        .map(p => ({ text: p.text }));
      systemInstruction = { parts: textParts };
      continue;
    }

    const geminiRole = message.role === "assistant" ? "model" : "user";
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    for (const part of contentParts) {
      if (part.type === "text") {
        parts.push({ text: part.text });
      } else if (part.type === "image_url") {
        // Handle base64 image data
        const url = part.image_url.url;
        if (url.startsWith("data:")) {
          const [header, data] = url.split(",");
          const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
          parts.push({ inlineData: { mimeType, data } });
        } else {
          // For URL-based images, we'd need to fetch and convert
          // For now, skip or handle as text
          parts.push({ text: `[Image: ${url}]` });
        }
      }
    }

    if (parts.length > 0) {
      contents.push({ role: geminiRole, parts });
    }
  }

  return { systemInstruction, contents };
}

// Convert Gemini response to OpenAI-compatible format
function convertFromGeminiResponse(geminiResponse: any, model: string): InvokeResult {
  const candidate = geminiResponse.candidates?.[0];
  const content = candidate?.content;
  const text = content?.parts?.map((p: any) => p.text || "").join("") || "";

  return {
    id: `gemini-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: text,
        },
        finish_reason: candidate?.finishReason || "stop",
      },
    ],
    usage: geminiResponse.usageMetadata
      ? {
          prompt_tokens: geminiResponse.usageMetadata.promptTokenCount || 0,
          completion_tokens: geminiResponse.usageMetadata.candidatesTokenCount || 0,
          total_tokens: geminiResponse.usageMetadata.totalTokenCount || 0,
        }
      : undefined,
  };
}

const assertApiKey = () => {
  if (!ENV.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const { messages, maxTokens, max_tokens } = params;
  const model = "gemini-2.0-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ENV.geminiApiKey}`;

  const { systemInstruction, contents } = convertToGeminiFormat(messages);

  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens || max_tokens || 8192,
      temperature: 0.7,
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = systemInstruction;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const geminiResponse = await response.json();
  return convertFromGeminiResponse(geminiResponse, model);
}
