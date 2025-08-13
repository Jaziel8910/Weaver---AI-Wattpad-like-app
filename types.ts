

export interface ChapterOption {
  text: string;
  nextChapterId: string;
}

export interface Note {
  paragraphId: string;
  content: string;
  isPublic: boolean;
  authorId: string;
  authorUsername: string;
}

export interface Chapter {
  id: string; // Unique ID for each chapter
  title: string;
  content: string;
  illustrationUrl?: string;
  illustrationPrompt?: string;
  options?: ChapterOption[]; // For branching narratives
  critique?: Record<string, { score: number; comment: string; suggestion?: string }>; // For Doctor IA
  emotionTags?: string[]; // For dynamic backgrounds, e.g., 'suspense', 'romance', 'action'
  microSummary: string; // For chapter lists in preview
  notes?: Note[];
}

export interface LoreEntry {
    id: string;
    title: string;
    category: 'Lugar' | 'Objeto' | 'Personaje Secundario' | 'Evento Histórico' | 'Concepto';
    content: string;
}

export interface GlossaryEntry {
    term: string;
    definition: string;
}

export interface Review {
    authorId: string;
    authorUsername:string;
    rating: number; // 1-5
    text: string;
}

export interface FandomData {
    forumPosts: any[]; // Placeholder for ForumPost
    polls: any[]; // Placeholder for Poll
    theories: any[]; // Placeholder for Theory
    fanart: any[]; // Placeholder for Fanart
}

export interface Story {
  id:string;
  title:string;
  summary: string;
  tags: string[];
  chapters: Chapter[]; // A flat list of all possible chapters in the story
  chapterHistory: string[]; // An array of chapter IDs representing the user's path
  coverUrl: string;
  animatedCoverUrl?: string; // For animated/3D covers
  readingTimeMinutes: number;
  params: GenerationParams;
  isBranching?: boolean; // Flag to indicate if the story has branches
  loreBook?: LoreEntry[]; // For World Anvil feature
  ageRating?: string; // Kept for backwards compatibility
  weaverAgeRating?: WeaverAgeRating;
  starRating?: number;
  whatToExpect?: string;
  authorTrivia?: string; // New field for preview
  interactiveMapUrl?: string; // New field for preview
  timelineData?: any; // New field for preview, structure TBD
  socialStats?: { activeReaders: number; featuredReviews: Review[]; associatedFandoms: string[] };
  glossary?: GlossaryEntry[];
  fandomData?: FandomData;
  // Weaver Universe fields
  universeId?: string;
  saga?: { id: string, name: string };
  spinOffFrom?: string; // Story ID
  crossoverWith?: string[]; // Story IDs
  isCuratedForKids?: boolean; // New field for Weaver Kids
}

export type StoryType = 'Fanfiction' | 'Original';
export type Complexity = 'Baja' | 'Media' | 'Alta';
export type ChapterLength = 'Corta (~500 palabras)' | 'Media (~1500 palabras)' | 'Larga (~2500 palabras)';
export type WritingStyle = 'Cinematográfico' | 'Literario' | 'Humorístico' | 'Oscuro y Valiente' | 'Poético';
export type PointOfView = 'Primera Persona (Protagonista)' | 'Tercera Persona Limitada' | 'Tercera Persona Omnisciente';
export type Genre = 'Ciencia Ficción' | 'Fantasía' | 'Romance' | 'Terror' | 'Misterio' | 'Aventura' | 'Drama' | 'Comedia' | 'Thriller' | 'Histórico' | 'Cyberpunk';
export type Tone = 'Épico' | 'Comédico' | 'Melancólico' | 'Esperanzador' | 'Suspenso' | 'Serio';
export type Pacing = 'Lento y Descriptivo' | 'Equilibrado' | 'Rápido y Lleno de Acción';
export type ContentRating = 'Family-Friendly' | 'Teen' | 'Mature' | 'Explicit'; // Legacy, use WeaverAgeRating and explicitContent flags
export type WeaverAgeRating = 'Kids' | 'Teen' | 'Mature' | 'Adult';


export interface ContextFile {
    name: string;
    type: 'text' | 'image' | 'pdf';
    content: string; // text content or base64 data URL for images
}

export interface Relationship {
    characterId: string;
    characterName: string;
    type: string; // e.g., 'Amigo', 'Enemigo', 'Padre', 'Hijo'
    description: string;
}

export interface CharacterArc {
    title: string;
    description: string;
    progress: number; // 0-100
}

export interface Character {
    id: string;
    name: string;
    role: 'Protagonista' | 'Antagonista' | 'Secundario' | 'Interés Amoroso' | 'Mentor';
    description: string;
    memoryVector?: string[]; // For advanced character consistency
    portraitUrl?: string; // For AI generated character portraits
    // New fields
    age?: number | string;
    status?: 'Vivo' | 'Muerto' | 'Desaparecido' | 'Otro Universo';
    relationships?: Relationship[];
    powers?: string[];
    backstory?: string;
    characterArcs?: CharacterArc[];
    universeId?: string;
}

export interface ExplicitContentFlags {
    sexuality: boolean;
    suicide: boolean;
    selfHarm: boolean;
    violence: boolean;
    drugs: boolean;
}

export interface GenerationParams {
  storyType: StoryType;
  fandom: string;
  setting: string;
  genres: Genre[];
  characters: Character[];
  plotOutline: string;
  writingStyle: WritingStyle;
  pointOfView: PointOfView;
  tone: Tone;
  pacing: Pacing;
  complexity: Complexity;
  chapters: number;
  chapterLength: ChapterLength;
  generateIllustrations: boolean;
  contextFiles: ContextFile[];
  inspirationPrompt?: string; // From the inspiration board
  enableBranching: boolean; // New option to enable interactive stories
  customIllustrationStyle?: string; // Pro feature
  activePluginId?: string; // For style plugins
  contentRating: ContentRating; // Legacy
  // New fields
  weaverAgeRating?: WeaverAgeRating;
  explicitContent?: ExplicitContentFlags;
  universeId?: string;
}

export interface GenerationPreset extends GenerationParams {
    presetName: string;
}

export interface PilotChapterResponse {
    title: string;
    summary: string;
    tags?: string[];
    pilotChapter: {
        id: string;
        title: string;
        content: string;
        illustration_prompt: string;
        options?: ChapterOption[];
        microSummary: string;
    };
}

export interface RemainingStoryResponse {
    chapters: Array<{
        id: string;
        title: string;
        content: string;
        illustration_prompt: string;
        options?: ChapterOption[];
        microSummary: string;
    }>;
}

export type SortKey = 'date' | 'title';
export type ReaderTheme = 'dark' | 'light' | 'sepia' | 'high-contrast' | 'neon-noir' | 'solarized' | 'dracula';
export type ReaderFont = 'sans' | 'serif' | 'dyslexic';
export type ImageQuality = 'Standard' | 'Alta';
export type UserTier = 'free' | 'essentials' | 'pro' | 'ultra';
export type WriterRank = 'C' | 'B' | 'A' | 'S' | 'S+';
export type AvatarFrame = 'none' | 'gold' | 'neon';
export type UITooltip = 'none' | 'basic' | 'advanced';

// --- NEW EXPANDED SETTINGS ---

export type Language = 'Español' | 'English' | 'Français' | 'Deutsch';
export type AILanguage = 'Español' | 'English';
export type StartupView = 'Biblioteca' | 'Última Historia Leída' | 'Crear Nueva Historia';
export type CreatorArchetype = 'World-Builder' | 'Character-Artist' | 'Plot-Weaver' | 'Explorer';

export interface GeneralSettings {
    appLanguage: Language;
    startupView: StartupView;
    timezone: string;
    uiTheme: 'dark' | 'solarized' | 'dracula';
    uiMode: 'standard' | 'kids'; // New for Weaver Kids
    showTooltips: UITooltip;
    lastRead: { storyId: string; chapterId: string; scrollPosition: number; } | null;
    notificationSettings: {
        storyReady: boolean;
        achievements: boolean;
        social: boolean;
        promotions: boolean;
    };
    matureContentFilter: 'on' | 'off';
}

export interface SecurityQuestion {
    question: string;
    answerHash: string; // The answer is never stored in plaintext
}

export interface TierPurchase {
    tier: UserTier;
    purchaseDate: string; // ISO date string
    cost: number;
}

export interface DailyQuest {
    id: string;
    title: string;
    description: string;
    reward: number;
    completed: boolean;
    completedDate?: string;
}

export interface Quests {
    firstStoryCompleted: boolean;
    tenChaptersRead: boolean;
    firstFriendAdded: boolean;
    firstPresetSaved: boolean;
}

// User profile and preferences collected during onboarding
export interface AccountSettings {
    userId: string; // Unique, persistent ID for the user
    username: string;
    avatarUrl: string; // Can be a default URL or a base64 data URL
    status: string;
    tier: UserTier;
    tierExpiresAt: string | null;
    autoRenewTier: boolean;
    // Onboarding preferences
    creatorArchetype?: CreatorArchetype;
    favoriteGenres: Genre[];
    favoriteFandoms: string;
    favoriteWritingStyle: WritingStyle;
    favoriteCharacters: string;
    // Economy and integrity
    weaverins: number;
    savingsGoal: number;
    stingyMode: boolean;
    purchases: TierPurchase[];
    quests: Quests;
    signingKeyPair: { // Stored as JWK for portability
        privateKey: JsonWebKey;
        publicKey: JsonWebKey;
    };
    achievements: Record<string, string>; // Key: achievement ID, Value: ISO date string of unlock
    avatarFrame: AvatarFrame;
    // Security
    passwordHint?: string;
    securityQuestions?: SecurityQuestion[];
    isAgeVerified?: boolean;
    matureContentPIN?: string;
    // New fields
    writerRank?: WriterRank;
    rankPoints?: number;
    dailyQuests?: DailyQuest[];
    parentalControls?: { pin: string; contentFilters: WeaverAgeRating[]; timeLimits: any; } | null;
    // Passkey for passwordless login alpha
    passkeyCredentialId?: string; // base64url encoded
    passkeyPublicKey?: JsonWebKey;
}

export interface StylePlugin {
    id: string;
    name: string;
    author: string;
    description: string;
    systemInstruction: string;
    styleExamples: string[];
}

export interface AIGenerationSettings {
    defaultWritingStyle: WritingStyle;
    defaultPointOfView: PointOfView;
    aiLanguage: AILanguage;
    creativeFreedom: number; // 0-100 slider
    storyContinuityLevel: number; // 0-100 slider
    branchingComplexity: number; // 0-100 slider
    defaultIllustrationStyle: string;
    defaultNegativePrompt: string;
    autoGenerateTags: boolean;
    imageQuality: ImageQuality;
    plugins: StylePlugin[];
    defaultComplexity?: Complexity;
}

export interface ReaderDefaultSettings {
    font: ReaderFont;
    fontSize: number;
    theme: ReaderTheme;
    lineHeight: number; // e.g., 1.5, 1.75, 2.0
    justifyText: boolean;
    showProgressBar: boolean;
    showTimeLeft: boolean;
    autoLoadNextChapter: boolean;
    tapNavigation: boolean;
    enableBionicReading: boolean;
    // New fields
    cinemaMode?: boolean;
    dynamicTypography?: boolean;
    dynamicBackgrounds?: boolean;
    showMiniHud?: boolean;
}

export interface AccessibilitySettings {
    highContrast: boolean;
    dyslexiaFriendlyFont: boolean;
    reduceAnimations: boolean;
    textToSpeech: boolean;
    ttsVoice: string;
    ttsSpeed: number; // 0.5 to 2
    ttsPitch: number; // 0.5 to 2
    voiceNavigation: boolean;
}

export interface StorageSettings {
    autoSaveEnabled: boolean;
    autoSaveInterval: number; // seconds
    maxCacheSizeMB: number;
    autoClearCache: boolean;
    quickAccessVault: string | null; // Stores the base64 encrypted .swe content for quick access
}

export interface ConnectionSettings {
    downloadIllustrationsOnWifiOnly: boolean;
    syncOnWifiOnly: boolean;
    dataSaverMode: boolean;
}

export interface Friend {
    userId: string;
    username: string;
    avatarUrl: string;
    status: string;
}

export interface SocialSettings {
    profileVisibility: 'Público' | 'Solo Amigos' | 'Privado';
    showOnlineStatus: boolean;
    allowFriendRequests: boolean;
    allowStoryComments: 'everyone' | 'friends' | 'none';
    friendsList: Friend[]; // array of friend profiles
    blockedUsers: string[]; // array of userIds
}

export interface PrivacySettings {
    dataProcessingConsent: boolean;
    shareAnalytics: boolean;
}

export interface KeybindingsSettings {
    nextPage: string;
    prevPage: string;
    toggleFocusMode: string;
    openSettings: string;
    newStory: string;
    commandPalette: string;
}

export interface Universe {
    id: string;
    name: string;
    description: string;
    timeline: any; // Placeholder for timeline data structure
    worldMapUrl?: string;
    history: string;
    worldLaws: string; // e.g., laws of magic, physics
    // --- EXPANDED BETA FIELDS ---
    races?: { id: string; name: string; description: string; }[];
    magicSystems?: { id: string; name: string; description: string; }[];
    technologies?: { id: string; name: string; description: string; }[];
    // --- END EXPANDED BETA FIELDS ---
    storyIds: string[];
    characterIds: string[];
    ownerId: string;
}

export interface AppSettings {
    general: GeneralSettings;
    account: AccountSettings;
    ai: AIGenerationSettings;
    readerDefaults: ReaderDefaultSettings;
    accessibility: AccessibilitySettings;
    storage: StorageSettings;
    connection: ConnectionSettings;
    social: SocialSettings;
    privacy: PrivacySettings;
    keybindings: KeybindingsSettings;
}

// Data structure for the encrypted .swe file
export interface SweFileBundle {
    stories: Story[];
    presets: GenerationPreset[];
    settings: AppSettings;
    universes: Universe[]; // Added for Weaver Universe
    readerSettings: { // Kept for backwards compatibility
        theme: ReaderTheme;
        font: ReaderFont;
        fontSize: number;
    };
    version: number;
}


// Public, signed "business card" for adding friends without a password.
export interface ProfileCardData {
    userId: string;
    username: string;
    avatarUrl: string;
    status: string;
}

export interface SignedProfileCard {
    v: 'wpc1'; // Weaver Profile Card v1
    publicKey: JsonWebKey;
    data: string; // base64 encoded ProfileCardData
    sig: string; // base64 encoded signature
}

export interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
}