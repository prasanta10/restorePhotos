import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  plag: number;
};
interface ExtendedNextApiRequest extends NextApiRequest {
  body: {
    img1: string;
    img2: string;
  };
}

interface OCRResponse {
  ParsedResults: {
    TextOverlay: {
      Lines: {
        LineText: string;
      }[];
    };
    ErrorMessage: string;
    ErrorDetails: string;
  }[];
}

export default async function handler(
  req: ExtendedNextApiRequest,
  res: NextApiResponse<Data>
) {

  const img1 = req.body.img1;
  const img2 = req.body.img2;
  console.log("img", img1, img2);

  const [text1, text2] = await Promise.all([
    extractTextFromImage(img1),
    extractTextFromImage(img2),
  ]);

  console.log("text", text1, text2);
  const per = await getSimilarityPercentage(text1, text2);
  console.log("per", per);
  // console.log("text", text);
  res.status(200).json({
    plag: per,
  });
}
async function extractTextFromImage(imageUrl: string): Promise<string> {
  const ocrApiKey = "K81633040388957";
  const ocrApiUrl = "https://api.ocr.space/parse/image";

  const response = await fetch(ocrApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `apikey=${ocrApiKey}&url=${imageUrl}&isOverlayRequired=true`,
  });

  if (!response.ok) {
    throw new Error("Failed to call OCR API");
  }

  const ocrResponse: OCRResponse = await response.json();
  console.log("ocrResponse", JSON.stringify(ocrResponse));

  if (
    ocrResponse.ParsedResults[0].ErrorMessage ||
    !ocrResponse.ParsedResults[0].TextOverlay
  ) {
    return "";
  }
  return ocrResponse.ParsedResults[0].TextOverlay.Lines.reduce(
    (text, line) => text + line.LineText,
    ""
  );
}

async function getSimilarityPercentage(
  text1: string,
  text2: string
): Promise<number> {
  try {
    const res = await fetch("https://api.api-ninjas.com/v1/textsimilarity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": "Uzl0UYxdi52T9IXOs7ouYw==vsEgxNxPBBHIIqgw",
      },
      body: JSON.stringify({
        text_1: text1,
        text_2: text2,
      }),
    });
    const data = await res.json();
    console.log("data", data);
    return data.similarity * 100;
  } catch (e) {
    console.log("error", e);
    return 0;
  }
}
