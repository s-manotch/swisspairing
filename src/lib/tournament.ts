export type Match = {
  board: number;
  leftName: string;
  leftScore: string;
  result: string;
  rightName: string;
  rightScore: string;
  winner: string;
};

export type TournamentData = {
  title: string;
  roundLabel: string;
  players: string[];
  matches: Match[];
};

export type StoredTournamentData = TournamentData & {
  sourceFileName: string;
  updatedAt: string;
};

function normalizeBuffer(input: ArrayBuffer | Uint8Array) {
  if (input instanceof ArrayBuffer) {
    return input;
  }

  return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
}

function parseRoundLabel(title: string) {
  const match = title.match(/round\s*(\d+)/i);
  return match?.[1] ?? "-";
}

function determineWinner(match: Omit<Match, "winner">) {
  if (match.result.startsWith("1:")) {
    return match.leftName;
  }

  if (match.result.endsWith(":1")) {
    return match.rightName;
  }

  return "เสมอ";
}

function parsePlayers(block: string) {
  return block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /^\d+\./.test(line))
    .map((line) => line.replace(/^\d+\.\s*/, "").trim());
}

function parseMatches(block: string) {
  return block
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => /^\d+\s/.test(line))
    .map((line) => {
      const parsed = line.match(
        /^(\d+)\s+(.+?)\s+(\[[^\]]+\])\s+([0-9.]+:[0-9.]+)\s+(.+?)\s+(\[[^\]]+\])$/,
      );

      if (!parsed) {
        return null;
      }

      const [, board, leftName, leftScore, result, rightName, rightScore] = parsed;
      const match = {
        board: Number(board),
        leftName: leftName.trim(),
        leftScore,
        result,
        rightName: rightName.trim(),
        rightScore,
      };

      return {
        ...match,
        winner: determineWinner(match),
      };
    })
    .filter((match): match is Match => match !== null);
}

export function parseTournamentHtml(html: string): TournamentData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const title =
    doc.querySelector("h1")?.textContent?.trim() ||
    doc.title ||
    "Tournament Results";

  const headings = Array.from(doc.querySelectorAll("h2"));
  const playersHeading = headings.find((node) =>
    node.textContent?.toLowerCase().includes("list of players"),
  );
  const resultsHeading = headings.find((node) =>
    node.textContent?.toLowerCase().includes("results"),
  );

  const playersBlock = playersHeading?.nextElementSibling?.textContent ?? "";
  const resultsBlock = resultsHeading?.nextElementSibling?.textContent ?? "";

  const players = parsePlayers(playersBlock);
  const matches = parseMatches(resultsBlock);

  if (!players.length || !matches.length) {
    throw new Error(
      "ไฟล์นี้ยังอ่านข้อมูลไม่ได้ กรุณาใช้ไฟล์ผลการแข่งขันรูปแบบ Swiss Perfect",
    );
  }

  return {
    title,
    roundLabel: parseRoundLabel(title),
    players,
    matches,
  };
}

function extractDeclaredCharset(buffer: ArrayBuffer) {
  const asciiHead = new TextDecoder("ascii").decode(buffer.slice(0, 2048));
  const match = asciiHead.match(/charset\s*=\s*["']?\s*([a-z0-9_-]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function countMatches(text: string, pattern: RegExp) {
  return (text.match(pattern) ?? []).length;
}

function scoreDecodedText(text: string) {
  const thaiChars = countMatches(text, /[\u0E00-\u0E7F]/g);
  const replacementChars = countMatches(text, /\uFFFD/g);
  const mojibakeHints = countMatches(text, /[ÃÂà€¢œ�]/g);
  const readableMarkers = countMatches(
    text,
    /(List of Players|Results|Round|Swiss Perfect)/gi,
  );

  return thaiChars * 3 + readableMarkers * 8 - replacementChars * 20 - mojibakeHints * 6;
}

function tryDecode(buffer: ArrayBuffer, encoding: string) {
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return null;
  }
}

export function decodeTournamentFile(input: ArrayBuffer | Uint8Array) {
  const buffer = normalizeBuffer(input);
  const declaredCharset = extractDeclaredCharset(buffer);
  const encodings = [declaredCharset, "utf-8", "windows-874", "iso-8859-11"].filter(
    (encoding): encoding is string => Boolean(encoding),
  );

  let bestText = "";
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const encoding of encodings) {
    const decoded = tryDecode(buffer, encoding);

    if (!decoded) {
      continue;
    }

    const score = scoreDecodedText(decoded);

    if (score > bestScore) {
      bestScore = score;
      bestText = decoded;
    }
  }

  if (bestText) {
    return bestText;
  }

  return new TextDecoder("utf-8").decode(buffer);
}
