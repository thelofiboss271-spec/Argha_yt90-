
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { StudentClass, Language, ExplanationMode } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const solveDoubtStream = async function* (
  query: string,
  studentClass: StudentClass,
  lang: Language,
  mode: ExplanationMode,
  imageBase64?: string
) {
  const ai = getAI();
  const model = 'gemini-3-flash-preview';
  
  const prompt = `Student Class: ${studentClass}
Language: ${lang}
Mode: ${mode}
Query: ${query}

Rules:
- Adapt to regional Indian school syllabus where appropriate (West Bengal/Pan-India).
- Strictly follow the structure: Restate, Concept, Step-by-Step, Calculations, Final Answer, Recap.
- Detect if the question is trending/exam-important and mention it.
`;

  const contents: any[] = [{ text: prompt }];
  if (imageBase64) {
    contents.push({
      inlineData: {
        mimeType: 'image/png',
        data: imageBase64.split(',')[1] || imageBase64
      }
    });
  }

  const responseStream = await ai.models.generateContentStream({
    model,
    contents: { parts: contents },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
};

export const generateVisualAid = async (topic: string, studentClass: StudentClass) => {
  const ai = getAI();
  const prompt = `A clear, simple educational diagram for a ${studentClass} student explaining: ${topic}. White background, minimalist, labeled clearly. No text overload. High educational value.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio: '1:1' }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const generateVideoExplainer = async (scriptTopic: string, studentClass: StudentClass, imageBase64?: string) => {
  const ai = getAI();
  const prompt = `Educational video for a ${studentClass} student about: ${scriptTopic}. Focus on concept clarity.`;
  
  const config: any = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: '16:9'
  };

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    ...(imageBase64 && {
      image: {
        imageBytes: imageBase64.split(',')[1] || imageBase64,
        mimeType: 'image/png'
      }
    }),
    config
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await videoResponse.blob();
  return URL.createObjectURL(blob);
};
