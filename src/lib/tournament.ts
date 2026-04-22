export type Match = {
  board: number;
  leftName: string;
  leftClub: string;
  leftScore: string;
  result: string;
  rightName: string;
  rightClub: string;
  rightScore: string;
  winner: string;
};

export type TournamentData = {
  title: string;
  roundLabel: string;
  players: string[];
  matches: Match[];
};

export type StandingEntry = {
  place: string;
  name: string;
  club: string;
  score: string;
  wins: string;
  medianBuchholz: string;
  buchholz: string;
  berger: string;
};

export type StoredTournamentData = TournamentData & {
  sourceFileName: string;
  updatedAt: string;
};

export const tournamentCategories = [
  { id: "type-1", label: "หมากรุกไทย บุคคล ชาย" },
  { id: "type-2", label: "หมากรุกไทย บุคคล หญิง" },
  { id: "type-3", label: "หมากฮอส บุคคล ชาย" },
  { id: "type-4", label: "หมากฮอส บุคคล หญิง" },
  { id: "type-5", label: "หมากล้อม บุคคล ชาย" },
  { id: "type-6", label: "หมากล้อม บุคคล หญิง" },
  { id: "type-7", label: "หมากรุกไทย ทีม ชาย" },
  { id: "type-8", label: "หมากรุกไทย ทีม หญิง" },
  { id: "type-9", label: "หมากฮอส ทีม ชาย" },
  { id: "type-10", label: "หมากฮอส ทีม หญิง" },
  { id: "type-11", label: "หมากล้อม ทีม ชาย" },
  { id: "type-12", label: "หมากล้อม ทีม หญิง" },
] as const;

export const tournamentRounds = [
  { id: "round-1", label: "รอบ 1", roundNumber: 1 },
  { id: "round-2", label: "รอบ 2", roundNumber: 2 },
  { id: "round-3", label: "รอบ 3", roundNumber: 3 },
  { id: "round-4", label: "รอบ 4", roundNumber: 4 },
  { id: "round-5", label: "รอบ 5", roundNumber: 5 },
] as const;

export const tournamentDocumentKinds = [
  { id: "results", label: "ผลการแข่งขัน" },
  { id: "standings", label: "Standings" },
  { id: "players", label: "รายชื่อผู้เล่น" },
  { id: "other", label: "ข้อมูลอื่น ๆ" },
] as const;

export const publicDocumentKinds = [
  { id: "regulations", label: "ระเบียบการแข่งขัน" },
  { id: "handbook", label: "สูจิบัติ" },
  { id: "schedule", label: "กำหนดการแข่งขัน" },
] as const;

export type TournamentCategoryId = (typeof tournamentCategories)[number]["id"];
export type TournamentRoundId = (typeof tournamentRounds)[number]["id"];
export type TournamentDocumentKind = (typeof tournamentDocumentKinds)[number]["id"];
export type PublicDocumentKind = (typeof publicDocumentKinds)[number]["id"];

export type TournamentDocument = {
  id: string;
  kind: TournamentDocumentKind;
  title: string;
  sourceFileName: string;
  updatedAt: string;
  contentText: string;
  imageDataUrl: string | null;
  parsedData: StoredTournamentData | null;
};

export type PublicDocument = {
  kind: PublicDocumentKind;
  title: string;
  sourceFileName: string;
  updatedAt: string;
  dataUrl: string;
};

export type TournamentRoundRecord = {
  roundId: TournamentRoundId;
  roundLabel: string;
  documents: TournamentDocument[];
};

export type TournamentCategoryRecord = {
  categoryId: TournamentCategoryId;
  sharedDocuments: TournamentDocument[];
  rounds: Partial<Record<TournamentRoundId, TournamentRoundRecord>>;
};

export type StoredTournamentCollection = Partial<
  Record<TournamentCategoryId, TournamentCategoryRecord>
>;

export function isTournamentCategoryId(value: string): value is TournamentCategoryId {
  return tournamentCategories.some((category) => category.id === value);
}

export function getTournamentCategoryLabel(categoryId: TournamentCategoryId) {
  return tournamentCategories.find((category) => category.id === categoryId)?.label ?? categoryId;
}

export function isTournamentRoundId(value: string): value is TournamentRoundId {
  return tournamentRounds.some((round) => round.id === value);
}

export function getTournamentRoundLabel(roundId: TournamentRoundId) {
  return tournamentRounds.find((round) => round.id === roundId)?.label ?? roundId;
}

export function isTournamentDocumentKind(value: string): value is TournamentDocumentKind {
  return tournamentDocumentKinds.some((kind) => kind.id === value);
}

export function getTournamentDocumentKindLabel(kind: TournamentDocumentKind) {
  return tournamentDocumentKinds.find((item) => item.id === kind)?.label ?? kind;
}

export function isPublicDocumentKind(value: string): value is PublicDocumentKind {
  return publicDocumentKinds.some((kind) => kind.id === value);
}

export function getPublicDocumentKindLabel(kind: PublicDocumentKind) {
  return publicDocumentKinds.find((item) => item.id === kind)?.label ?? kind;
}

export function getRoundIdFromRoundNumber(roundNumber: number): TournamentRoundId {
  return tournamentRounds.find((round) => round.roundNumber === roundNumber)?.id ?? "round-1";
}

export function getLatestParsedTournamentData(category?: TournamentCategoryRecord | null) {
  if (!category) {
    return null;
  }

  const rounds = Object.values(category.rounds).filter(Boolean);

  for (const round of rounds) {
    const parsedData = round?.documents.find((document) => document.parsedData)?.parsedData ?? null;

    if (parsedData) {
      return parsedData;
    }
  }

  return null;
}

export function getCategoryDocumentsForRound(
  category: TournamentCategoryRecord | null | undefined,
  roundId: TournamentRoundId,
) {
  if (!category) {
    return [];
  }

  const roundDocuments = category.rounds[roundId]?.documents ?? [];
  return [...category.sharedDocuments, ...roundDocuments];
}

function normalizeBuffer(input: ArrayBuffer | Uint8Array) {
  if (input instanceof ArrayBuffer) {
    return input;
  }

  return Uint8Array.from(input).buffer;
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

export function splitTournamentPerson(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return {
      name: "",
      club: "",
    };
  }

  const withThaiSurnamePattern = normalized.match(
    /^(.+?,\s*[^ ]+(?:\sณ\s[^ ]+)?)\s+(.+)$/,
  );

  if (withThaiSurnamePattern) {
    return {
      name: withThaiSurnamePattern[1].trim(),
      club: withThaiSurnamePattern[2].trim(),
    };
  }

  return {
    name: normalized,
    club: "",
  };
}

function parsePlayers(block: string) {
  return block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /^\d+\./.test(line))
    .map((line) => line.replace(/^\d+\.\s*/, "").trim());
}

export function parsePlayersFromText(text: string) {
  return parsePlayers(text);
}

export function parseTournamentMatchesFromText(text: string) {
  return parseMatches(text);
}

export function parseTournamentStandingsFromText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => /^(\d+(?:-\d+)?)\s+/.test(line))
    .map((line) => {
      const parsed = line.match(
        /^(\d+(?:-\d+)?)\s+(.+?)\s+([0-9.+-]+)\s+([0-9.+-]+)\s+([0-9.+-]+)\s+([0-9.+-]+)\s+([0-9.+-]+)$/,
      );

      if (!parsed) {
        return null;
      }

      const [, place, participant, score, wins, medianBuchholz, buchholz, berger] = parsed;
      const { name, club } = splitTournamentPerson(participant);

      return {
        place,
        name,
        club,
        score,
        wins,
        medianBuchholz,
        buchholz,
        berger,
      };
    })
    .filter((entry): entry is StandingEntry => entry !== null);
}

export function formatAlignedTextBlock(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (!lines.length) {
    return "";
  }

  const labelledLines = lines.map((line) => {
    const match = line.match(/^([^:]{1,40}):\s*(.+)$/);

    if (!match) {
      return null;
    }

    const [, label, value] = match;
    return {
      label: label.trim(),
      value: value.trim(),
    };
  });

  if (labelledLines.every(Boolean)) {
    const width = Math.max(...labelledLines.map((line) => line!.label.length));

    return labelledLines
      .map((line) => `${line!.label.padEnd(width, " ")} : ${line!.value}`)
      .join("\n");
  }

  return lines.join("\n");
}

function normalizeContentText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
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
        const fallbackParsed = line.match(/^(\d+)\s+(.+?)\s+([0-9.+-]+:[0-9.+-]+)\s+(.+)$/);

        if (!fallbackParsed) {
          return null;
        }

        const [, board, leftParticipant, result, rightParticipant] = fallbackParsed;
        const left = splitTournamentPerson(leftParticipant);
        const right = splitTournamentPerson(rightParticipant);
        const match = {
          board: Number(board),
          leftName: left.name,
          leftClub: left.club,
          leftScore: "",
          result,
          rightName: right.name,
          rightClub: right.club,
          rightScore: "",
        };

        return {
          ...match,
          winner: determineWinner(match),
        };
      }

      const [, board, leftName, leftScore, result, rightName, rightScore] = parsed;
      const left = splitTournamentPerson(leftName);
      const right = splitTournamentPerson(rightName);
      const match = {
        board: Number(board),
        leftName: left.name,
        leftClub: left.club,
        leftScore,
        result,
        rightName: right.name,
        rightClub: right.club,
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

export function extractTournamentDocumentText(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const title =
    doc.querySelector("h1")?.textContent?.trim() ||
    doc.querySelector("title")?.textContent?.trim() ||
    "Tournament Document";

  const bodyText = normalizeContentText(doc.body?.textContent ?? doc.documentElement?.textContent ?? "");

  return {
    title,
    contentText: bodyText,
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
