import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent, DragEvent, MouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { chatWithAgent, generatePrompt, refinePrompt, type AgentMessage } from './gemini-agent'
import { CanvasMode } from './canvas/CanvasMode'
import './App.css'

type BookPage = {
  blank?: boolean
  page: number
  text: string
}

type HeroSlide = {
  id: string
  title: string
  kicker: string
  caption: string
  kind: 'video' | 'image'
  src: string
  poster?: string
}

type ShowcaseMedia = {
  id: string
  title: string
  kicker?: string
  caption?: string
  description?: string
  kind: 'video' | 'image'
  src: string
  poster?: string
}

type CharacterCategory = 'protagonists' | 'antagonists' | 'sidekicks'

type CharacterPlacement = {
  x: number
  y: number
  scale: number
}

type CharacterProfile = {
  id: string
  category: CharacterCategory
  name: string
  role: string
  image: string
  imagePlacement?: CharacterPlacement
  videoPresentation?: string
  videoPlacement?: CharacterPlacement
  videoMuted?: boolean
  description: string
  traits: string[]
  backstory: string
}

type Track = {
  title: string
  mood: string
  src?: string
  cover: string
  color: string
}

const isVideoAsset = (src?: string) => Boolean(src && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(src))

type MerchProduct = {
  title: string
  subtitle: string
  images: string[]
  copy: string
  features: string[]
}

type ShowcaseCopy = Record<string, string>

type ShowcasePickerTarget = {
  target: 'hero' | 'gallery'
  index?: number
}

type StoryboardMedia = {
  id: string
  type: 'image' | 'video' | 'audio'
  url: string
  fileName: string
  localPath?: string
  createdAt: string
  trimStart?: number
  trimEnd?: number
  frameSecond?: number
  sourceVideoUrl?: string
}

type StoryboardShot = {
  id: string
  title: string
  prompt: string
  dialogue: string
  actor: string
  tags: string[]
  media: StoryboardMedia[]
  selectedMediaId?: string
  expanded?: boolean
}

type StoryboardResourceType = 'actors' | 'locations' | 'props' | 'moodboards'
type StoryboardSequenceMode = 'images' | 'videos' | 'audio'
type StoryboardSceneMode = StoryboardSequenceMode | StoryboardResourceType
type StoryboardResourceSlot = 'card' | 'sheet'

type StoryboardResource = {
  id: string
  type: StoryboardResourceType
  name: string
  description: string
  media: StoryboardMedia[]
  sheetMedia: StoryboardMedia[]
  selectedMediaId?: string
  selectedSheetMediaId?: string
  mode?: StoryboardResourceSlot
  expanded?: boolean
}

type StoryboardScene = {
  id: string
  title: string
  collapsed?: boolean
  mode: StoryboardSceneMode
  imageShots: StoryboardShot[]
  videoShots: StoryboardShot[]
  audioShots: StoryboardShot[]
  resourceRefs: Record<StoryboardResourceType, string[]>
}

type StoryboardAct = {
  id: string
  title: string
  collapsed?: boolean
  scenes: StoryboardScene[]
}

type AgentTask = {
  id: string
  title: string
  prompt: string
  status: 'todo' | 'working' | 'review' | 'done' | 'archived'
  sceneHint: string
  skillHint: string
  createdAt: string
  updatedAt: string
  generatedImages?: {
    id: string;
    url: string;
    note: string;
    selected: boolean;
    improve4k?: boolean;
    splitGrid?: boolean;
    doodleActive?: boolean;
    noteActive?: boolean;
    assignMenuOpen?: boolean;
    assignedType?: string;
    assignedName?: string;
    assignedScene?: string;
    improveMenuOpen?: boolean;
    splitMenuOpen?: boolean;
    improvePrompt?: string;
    improveModel?: string;
    improveRes?: string;
    improveRefType?: string;
    improveRefName?: string;
    improveRefSceneId?: string;
    splitType?: string;
    doodleDataUrl?: string;
    sourcePrompt?: string;
  }[]
  passes?: {
    id: string;
    name: string;
    images: any[];
  }[]
  activePassId?: string;
}

type StoryboardData = {
  actors: string[]
  locations: string[]
  resources: Record<StoryboardResourceType, StoryboardResource[]>
  agentTasks: AgentTask[]
  acts: StoryboardAct[]
  masterAspect?: number
}

const heroSlides: HeroSlide[] = [
  {
    id: 'main-trailer',
    title: 'Aisha and the Sands of Destiny',
    kicker: 'Main Trailer',
    caption: 'A luminous animated feature pitch: palace walls, forbidden markets, ancient magic, comic companions, and a princess learning to cross the line.',
    kind: 'video',
    src: '/assets/trailers/aisha-final-extended-trailer.mp4',
    poster: '/assets/locations/palace-exterior.png',
  },
  {
    id: 'teaser',
    title: 'Festival Teaser',
    kicker: 'Trailer 02',
    caption: 'A second moving slot inside the same cinematic window, ready to become the next campaign beat.',
    kind: 'video',
    src: '/assets/trailers/aisha-teaser-slot-2.mp4',
    poster: '/assets/locations/niura-rescue-grid.jpg',
  },
  {
    id: 'world',
    title: 'The Kingdom Ignites',
    kicker: 'World Art',
    caption: 'Qazar al-Zaman opens in turquoise domes, golden walls, dust-lit air, and a city already humming with story.',
    kind: 'image',
    src: '/assets/locations/palace-exterior.png',
  },
  {
    id: 'balcony',
    title: 'The Balcony of Longing',
    kicker: 'Act I Location',
    caption: 'The protected room and the forbidden view: Aisha’s first cinematic stage before the world calls her outward.',
    kind: 'image',
    src: '/assets/locations/aisha-room-balcony-interior.png',
  },
  {
    id: 'market',
    title: 'The Market of Wonders',
    kicker: 'Act II Reveal',
    caption: 'Strange artifacts, glowing cages, velvet carpets, living stalls, and the first breath of freedom.',
    kind: 'image',
    src: '/assets/locations/bedouin-wonder-tent-grid.png',
  },
  {
    id: 'night',
    title: 'Moonlit Magic',
    kicker: 'Night Conversion',
    caption: 'The same world after dark: glass-blue moonlight, balcony shadows, and ancient magic waking under the surface.',
    kind: 'image',
    src: '/assets/locations/magic-night-bedroom-balcony.png',
  },
]

const actNames = ['Intro', 'Act I', 'Act II', 'Act III', 'Act IV', 'Act V', 'Act VI', 'Act VII', 'Act VIII', 'Act IX', 'Act X', 'Act XI']

const storyboardStoragePath = '/Users/vaquita/Downloads/aisha/aisha-cannes-showcase/public/assets/storyboard'
const defaultStoryboardActors = ['Aisha', 'Dora', 'Niura', 'Altair', 'Djinn', 'Sharak', 'Zahra', 'Sultan']

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`

const createEmptyResourceRefs = (): Record<StoryboardResourceType, string[]> => ({
  actors: [],
  locations: [],
  props: [],
  moodboards: [],
})

const createResource = (type: StoryboardResourceType, name: string): StoryboardResource => ({
  id: makeId(type.slice(0, -1) || 'resource'),
  type,
  name,
  description: '',
  media: [],
  sheetMedia: [],
  mode: 'card',
})

const normalizeResource = (resource: Partial<StoryboardResource>, type: StoryboardResourceType, fallbackName: string): StoryboardResource => ({
  id: resource.id || makeId(type.slice(0, -1) || 'resource'),
  type,
  name: resource.name || fallbackName,
  description: resource.description || '',
  media: Array.isArray(resource.media) ? resource.media.filter(Boolean) as StoryboardMedia[] : [],
  sheetMedia: Array.isArray(resource.sheetMedia) ? resource.sheetMedia.filter(Boolean) as StoryboardMedia[] : [],
  selectedMediaId: resource.selectedMediaId,
  selectedSheetMediaId: resource.selectedSheetMediaId,
  mode: resource.mode === 'sheet' ? 'sheet' : 'card',
  expanded: Boolean(resource.expanded),
})

const normalizeResourceList = (resources: Partial<StoryboardResource>[] | undefined, type: StoryboardResourceType, fallbackNames: string[]) => {
  const source = resources?.length ? resources : fallbackNames.map((name) => createResource(type, name))
  return source.map((resource, index) => normalizeResource(resource, type, fallbackNames[index] || `${getResourceTypeLabel(type)} ${index + 1}`))
}

const createShot = (index: number, type: 'image' | 'video' | 'audio' = 'image'): StoryboardShot => ({
  id: makeId('shot'),
  title: `${type === 'image' ? 'Shot' : type === 'video' ? 'Video' : 'Track'} ${index}`,
  prompt: '',
  dialogue: '',
  actor: '',
  tags: [],
  media: [],
})

const createScene = (index: number): StoryboardScene => ({
  id: makeId('scene'),
  title: `Scene ${index}`,
  mode: 'images',
  imageShots: [createShot(1, 'image')],
  videoShots: [createShot(1, 'video')],
  audioShots: [createShot(1, 'audio')],
  resourceRefs: createEmptyResourceRefs(),
})

const createDefaultStoryboard = (): StoryboardData => ({
  actors: defaultStoryboardActors,
  locations: ['Aisha balcony', 'Qazar al-Zaman market', 'Mayyala', 'Mirage City', 'Shadow palace'],
  resources: {
    actors: defaultStoryboardActors.map((actor) => createResource('actors', actor)),
    locations: ['Aisha balcony', 'Qazar al-Zaman market', 'Mayyala', 'Mirage City', 'Shadow palace'].map((location) => createResource('locations', location)),
    props: ['Moonstone ring', 'Altair scroll', 'Golden cage', 'Talisman'].map((prop) => createResource('props', prop)),
    moodboards: [],
  },
  agentTasks: [],
  acts: Array.from({ length: 11 }, (_, index) => ({
    id: `act-${index + 1}`,
    title: `Act ${index + 1}`,
    scenes: [createScene(1)],
  })),
})

const normalizeStoryboard = (payload?: Partial<StoryboardData>): StoryboardData => {
  const fallback = createDefaultStoryboard()
  if (!payload?.acts?.length) return fallback

  const actorNames = payload.actors?.length ? payload.actors : defaultStoryboardActors
  const locationNames = payload.locations?.length ? payload.locations : fallback.locations
  const resources = {
    actors: normalizeResourceList(payload.resources?.actors, 'actors', actorNames),
    locations: normalizeResourceList(payload.resources?.locations, 'locations', locationNames),
    props: normalizeResourceList(payload.resources?.props, 'props', []),
    moodboards: normalizeResourceList(payload.resources?.moodboards, 'moodboards', []),
  }

  return {
    actors: resources.actors.map((resource) => resource.name),
    locations: resources.locations.map((resource) => resource.name),
    resources,
    agentTasks: payload.agentTasks || [],
    acts: payload.acts.map((act) => ({
      ...act,
      scenes: act.scenes.map((scene) => ({
        ...scene,
        mode: scene.mode || 'images',
        imageShots: scene.imageShots?.length ? scene.imageShots : [createShot(1, 'image')],
        videoShots: scene.videoShots?.length ? scene.videoShots : [createShot(1, 'video')],
        audioShots: scene.audioShots?.length ? scene.audioShots : [createShot(1, 'audio')],
        resourceRefs: {
          ...createEmptyResourceRefs(),
          ...(scene.resourceRefs || {}),
        },
      })),
    })),
  }
}

const getSceneShots = (scene: StoryboardScene, mode: StoryboardSequenceMode) => {
  if (mode === 'images') return scene.imageShots
  if (mode === 'videos') return scene.videoShots
  return scene.audioShots
}

const getMediaTypeForMode = (mode: StoryboardSequenceMode): StoryboardMedia['type'] => {
  if (mode === 'videos') return 'video'
  if (mode === 'audio') return 'audio'
  return 'image'
}

const galleryPool = [
  ['The Kingdom Ignites', '/assets/locations/palace-exterior.png'],
  ['Aisha’s Balcony', '/assets/locations/aisha-room-balcony-interior.png'],
  ['Balcony Exterior', '/assets/locations/aisha-balcony-exterior.jpg'],
  ['Palace Plaza View', '/assets/locations/aisha-balcony-plaza-view.jpg'],
  ['Front Balcony Lock', '/assets/locations/aisha-balcony-front.png'],
  ['The Wonder Market', '/assets/locations/niura-rescue-grid.jpg'],
  ['The Bedouin Tent', '/assets/locations/bedouin-wonder-tent-grid.png'],
  ['Moonlit Room', '/assets/locations/magic-night-bedroom-balcony.png'],
  ['Night Balcony', '/assets/locations/front-balcony-night.png'],
  ['Gilded Cage Mood', '/assets/locations/aisha-chapter-1.png'],
  ['Alternate Key Art', '/assets/locations/aisha-chapter-1-alt.png'],
  ['Location Bible', '/assets/locations/aisha-locations.png'],
]

const defaultShowcaseGallery: ShowcaseMedia[] = galleryPool.map(([title, src], index) => ({
  id: `gallery-${index}`,
  title,
  src,
  kind: 'image',
}))

const defaultShowcaseHero: ShowcaseMedia[] = heroSlides.map((slide) => ({ ...slide }))

const defaultShowcaseCopy: ShowcaseCopy = {
  artEyebrow: 'Art bible',
  artTitle: 'Act Gallery',
  artCopy: 'Choose an act, then browse twelve cinematic art slots for that chapter. As we add more final art, each act can receive its own dedicated set.',
  charactersEyebrow: 'Character bible',
  charactersTitle: 'Character Panels',
  charactersCopy: 'One active profile per section, with portrait selectors underneath. Text now lives in the same cinematic panel as the character.',
  scoreEyebrow: 'Original score',
  scoreTitle: 'Score Console',
  scoreCopy: '',
  bookEyebrow: 'Interactive story bible',
  bookTitle: 'The Magic Book',
  bookCopy: 'Readable pages inside the site, dark or light mode, act jumps, and direct page navigation.',
  merchEyebrow: 'Consumer products',
  merchTitle: 'Merchandise Campaign',
  merchCopy: 'First premium product concepts for dolls, plush companions, villain packs, jewelry-toys, and electronic creature sets.',
  contactEyebrow: 'Contact',
  contactTitle: 'BrightBox Animations',
  contactCopy: 'Based between Spain and Los Angeles for festival conversations, co-production, music, animation, and distribution partnerships.',
}

const characters: CharacterProfile[] = [
  {
    id: 'aisha',
    category: 'protagonists',
    name: 'Aisha',
    role: 'Princess of Qazar al-Zaman',
    image: '/assets/pdf-characters/main-protagonists/main-protagonists-p02-03.png',
    description: 'A curious sixteen-year-old princess whose longing for the outside world becomes the spark that changes two kingdoms.',
    traits: ['Sincere', 'Empathetic', 'Intelligent', 'Brave', 'Forgiving'],
    backstory: 'Raised behind palace walls for her own protection, Aisha has been taught safety before truth. Her story begins when wonder becomes stronger than fear.',
  },
  {
    id: 'dora',
    category: 'protagonists',
    name: 'Dora',
    role: 'Royal white panther',
    image: '/assets/pdf-characters/main-protagonists/main-protagonists-p04-02.png',
    description: 'A pampered royal guardian with a lazy smile, sharp comic timing, and far more loyalty than she admits.',
    traits: ['Loyal', 'Clever', 'Protective', 'Sharp sense of humor', 'Observant'],
    backstory: 'Dora would prefer sunbeams, grapes, and politics delayed forever, but she follows Aisha into danger because love is stronger than comfort.',
  },
  {
    id: 'niura',
    category: 'protagonists',
    name: 'Niura',
    role: 'Tiny white desert snake',
    image: '/assets/pdf-characters/main-protagonists/main-protagonists-p07-04.png',
    description: 'Small, fragile, funny, and brave: Niura enters as a rescued creature and becomes a loyal signal of danger and hidden truth.',
    traits: ['Anxious', 'Practical', 'Brave', 'Loyal', 'Playful humor'],
    backstory: 'Niura’s first wish is simply not to disappear in a pot. Aisha sees her fear, opens the cage, and gains a companion with a moonlit destiny.',
  },
  {
    id: 'sultan',
    category: 'protagonists',
    name: 'Sultan Amarkhan al-Hadith',
    role: 'Aisha’s father',
    image: '/assets/pdf-characters/main-protagonists/main-protagonists-p08-02.png',
    description: 'A grieving ruler who confuses protection with silence until Aisha’s courage forces him to face what he buried.',
    traits: ['Authoritative', 'Kind-hearted', 'Just', 'Protective', 'Wise'],
    backstory: 'He built walls around the kingdom and around his daughter. His arc is learning that love cannot survive by hiding truth forever.',
  },
  {
    id: 'prince-thamir',
    category: 'protagonists',
    name: 'Prince Thamir',
    role: 'Lost prince of the restored kingdom',
    image: '/assets/pdf-characters/main-protagonists/main-protagonists-p13-02.png',
    description: 'A gentle prince bound to the mystery of the sands, carrying warmth, secrecy, and a luminous connection to Aisha.',
    traits: ['Kind-hearted', 'Intelligent', 'Brave', 'Protective', 'Romantic'],
    backstory: 'Thamir’s path is hidden inside the spell history of the kingdoms. When balance returns, so does the future he and Aisha almost lost.',
  },
  {
    id: 'altair',
    category: 'protagonists',
    name: 'Altair',
    role: 'Royal messenger hawk',
    image: '/assets/pdf-characters/main-protagonists/main-protagonists-p15-01.png',
    description: 'A frantic royal hawk whose urgent delivery style is half military protocol, half comedy missile.',
    traits: ['Loyal', 'Royal', 'Dramatic', 'Fast', 'Easily offended'],
    backstory: 'Altair’s chaos opens doors. One scroll, one scream, one awkward hover beside the balcony: opportunity does knock, or scream.',
  },
  {
    id: 'plasma-character',
    category: 'protagonists',
    name: 'Plasma Character',
    role: 'Luminous cursed protector',
    image: '/assets/characters/plasma-character-idle.mp4',
    imagePlacement: { x: 0, y: 0, scale: 1 },
    description: 'A floating human-like figure made of golden plasma, torn between obedience, guilt, and the instinct to protect Aisha when it matters most.',
    traits: ['Luminous', 'Wounded', 'Protective', 'Elegant', 'Self-sacrificing'],
    backstory: 'He carries the ache of an old spell and the shame of serving the wrong master. His arc bends from frightened messenger to brave shield, choosing love and truth over command.',
  },
  {
    id: 'bedouin',
    category: 'antagonists',
    name: 'The Bedouin Merchant',
    role: 'Purveyor of dark objects',
    image: '/assets/pdf-characters/antagonists/antagonists-p02-01.png',
    description: 'A mysterious seller at the far edge of the market, surrounded by objects that feel older than the roads.',
    traits: ['Charismatic', 'Deceptive', 'Mischievous', 'Ancient presence'],
    backstory: 'He does not attack. He offers. His stall is a doorway disguised as a bargain, and the moonstone ring begins the next fracture of destiny.',
  },
  {
    id: 'oracle',
    category: 'antagonists',
    name: 'The Oracle',
    role: 'Guard of the Mirage City',
    image: '/assets/character-cutouts/oracle.png',
    description: 'A watchful keeper of forbidden knowledge, elegant and severe, with memory hidden behind every jewel.',
    traits: ['Ancient', 'Watchful', 'Ceremonial', 'Unsettling'],
    backstory: 'The Oracle guards old consequences. She stands where prophecy stops being decorative and becomes dangerous.',
  },
  {
    id: 'mir-kaan',
    category: 'antagonists',
    name: 'Prince Mir-Kaan',
    role: 'Ruler of Mirage City',
    image: '/assets/character-cutouts/mir-kaan.png',
    description: 'Polished, charming, and manipulative, Mir-Kaan smiles like a door closing.',
    traits: ['Manipulative', 'Power hungry', 'Deceptive', 'Elegant'],
    backstory: 'Mir-Kaan belongs to the beautiful surface of the trap: everything glitters, every courtesy has teeth.',
  },
  {
    id: 'mirage-vizier',
    category: 'antagonists',
    name: 'The Mirage Vizier',
    role: 'Palace lure of Mirage City',
    image: '/assets/storyboard/uploads/mirage-city-vizier-1778341811359.png',
    description: 'A silk-voiced court manipulator who guides Aisha toward the Mirage palace with polished courtesy, false concern, and the patience of a practiced trap.',
    traits: ['Polished', 'Calculating', 'Soft-spoken', 'Deceptive', 'Ceremonial'],
    backstory: 'He does not drag Aisha into danger; he arranges the path so she chooses it. Every bow, smile, and gesture is designed to make the palace feel safe until the doors close.',
  },
  {
    id: 'sharak',
    category: 'antagonists',
    name: 'Sharak',
    role: 'The Shadow King',
    image: '/assets/pdf-characters/antagonists/antagonists-p08-02.png',
    description: 'A theatrical villain of velvet, plasma, grief, and obsession, dangerous because he believes his wound is destiny.',
    traits: ['Dark-magic wielder', 'Vengeful', 'Maniacal', 'Aggressive', 'Jealous'],
    backstory: 'Sharak’s love curdled into possession. He is not darkness because he suffers; he becomes darkness because he makes the world pay for it.',
  },
  {
    id: 'nibzu',
    category: 'antagonists',
    name: 'Nibzu',
    role: 'Spider sidekick',
    image: '/assets/pdf-characters/antagonists/antagonists-p13-01.png',
    description: 'Goofy, loyal, shiny-eyed, and just dangerous enough to make every villain scene bounce.',
    traits: ['Dumb-funny', 'Loyal', 'Chaotic', 'Bouncy', 'Unsettling-cute'],
    backstory: 'Nibzu is comic relief with too many legs and terrible timing. Somehow, that makes Sharak scarier and funnier at once.',
  },
  {
    id: 'maz-khar',
    category: 'antagonists',
    name: 'Maz-Khar',
    role: 'Colossal desert mount',
    image: '/assets/character-cutouts/maz-khar.png',
    description: 'A massive creature built for storm scale, battlefield silhouette, and desert myth.',
    traits: ['Colossal', 'Armored', 'Fast', 'Intimidating'],
    backstory: 'Maz-Khar turns the desert itself into a chase machine: not a horse, not a monster, but a legend with hooves.',
  },
  {
    id: 'zafra',
    category: 'sidekicks',
    name: 'Zafra al Nour',
    role: 'Aisha’s mother',
    image: '/assets/pdf-characters/side-characters/side-characters-p02-02.png',
    description: 'A luminous maternal presence whose memory becomes the emotional key to Aisha’s courage.',
    traits: ['Wise', 'High-born', 'Honest', 'Devoted', 'Kind-hearted'],
    backstory: 'Zafra is not only what was lost. She becomes the proof that love can survive as guidance, memory, and light.',
  },
  {
    id: 'mirage-perfume-seller',
    category: 'antagonists',
    name: 'The Perfume Seller',
    role: 'Mirage City seller of Dream Veil perfume',
    image: '/assets/storyboard/uploads/parfume-seller-mirage-city-1778341811390.png',
    description: 'A mesmerizing market woman surrounded by jewel-like perfume bottles, fragrant oils, and impossible scents, including the dangerous Dream Veil perfume.',
    traits: ['Graceful', 'Persuasive', 'Mysterious', 'Market-wise', 'Dangerously charming'],
    backstory: 'In Mirage City she sells memory as scent: rose, amber, blue smoke, and the Dream Veil perfume that makes longing feel like truth. She is not purely cruel, but her stall belongs to the city’s beautiful deception.',
  },
  {
    id: 'ancestors',
    category: 'sidekicks',
    name: 'The Sand Ancestors',
    role: 'Protective spirits',
    image: '/assets/pdf-characters/side-characters/side-characters-p04-02.png',
    description: 'Ancient guardians shaped from sand, memory, and sacred duty.',
    traits: ['Protective', 'Silent', 'Majestic', 'Ancient'],
    backstory: 'They are awakened by Aisha’s courage and the kingdom’s buried memory, moving like sand that remembers its own name.',
  },
  {
    id: 'maestra',
    category: 'sidekicks',
    name: 'Maestra Safira',
    role: 'Palace teacher',
    image: '/assets/pdf-characters/side-characters/side-characters-p06-02.png',
    description: 'A warm but strict elder who carries lessons, ceremony, and palace order.',
    traits: ['Kind-hearted', 'Mentor', 'Organized', 'Traditional'],
    backstory: 'Safira represents the safe version of wisdom: useful, loving, and still not enough to hold Aisha back from the world.',
  },
  {
    id: 'hala',
    category: 'sidekicks',
    name: 'Hala',
    role: 'Market child',
    image: '/assets/pdf-characters/side-characters/side-characters-p08-01.png',
    description: 'A gentle, curious child whose presence makes the market feel alive and personal.',
    traits: ['Gentle', 'Innocent', 'Curious'],
    backstory: 'Hala is one of the small faces that turns the kingdom from a map into a living place worth protecting.',
  },
  {
    id: 'layan',
    category: 'sidekicks',
    name: 'Layan',
    role: 'Market woman',
    image: '/assets/pdf-characters/side-characters/side-characters-p10-01.png',
    description: 'A kind, heartfelt presence in the city streets, grounded in fabric, trade, and human warmth.',
    traits: ['Kind-hearted', 'Honest', 'Hard-working', 'Gentle'],
    backstory: 'Layan’s world is ordinary beauty: cloth, survival, tenderness, and the dignity of people Aisha was never allowed to know.',
  },
  {
    id: 'nadir',
    category: 'sidekicks',
    name: 'Nadir',
    role: 'Market artisan',
    image: '/assets/pdf-characters/side-characters/side-characters-p12-01.png',
    description: 'A textured city character with warmth, humor, and market-life detail.',
    traits: ['Hard-working', 'Honest', 'Practical', 'Warm'],
    backstory: 'Nadir helps make the market feel like a civilization, not a backdrop: every face has a rhythm, a job, and a private story.',
  },
  {
    id: 'tamlun',
    category: 'sidekicks',
    name: 'Tamlun',
    role: 'Royal beast of burden',
    image: '/assets/pdf-characters/side-characters/side-characters-p14-02.png',
    description: 'A gentle, massive creature with palace scale and travel-story charm.',
    traits: ['Strong', 'Gentle', 'Loyal', 'Patient'],
    backstory: 'Tamlun carries the warmth of the road: ceremonial, useful, and quietly heroic in the way only loyal animals can be.',
  },
]

const tracks: Track[] = [
  { title: 'Just One Wish', mood: 'Aisha’s intimate magical awakening.', src: '/assets/music/just-one-wish.mp3', cover: '/assets/locations/magic-night-bedroom-balcony.png', color: '#f7d978' },
  { title: 'Wake Again', mood: 'Ancient city memory returning to light.', src: '/assets/music/wake-again.mp3', cover: '/assets/locations/front-balcony-night.png', color: '#7edbff' },
  { title: 'Sharak Song', mood: 'Villain triumph, charm, and obsession.', src: '/assets/music/sharak-song.mp3', cover: '/assets/pdf-characters/antagonists/antagonists-p08-02.png', color: '#f06f8f' },
  { title: 'Thousand Wonders', mood: 'Market discovery, motion, and delight.', src: '/assets/music/thousand-wonders.wav', cover: '/assets/locations/niura-rescue-grid.jpg', color: '#a6f0b0' },
  { title: 'Before The Shadow', mood: 'A darker promise moving under the palace story.', src: '/assets/music/before-the-shadow.mp3', cover: '/assets/locations/bedouin-wonder-tent-grid.png', color: '#c7b8ff' },
  { title: 'Beasts Of Thunder', mood: 'Action, scale, and desert danger in motion.', src: '/assets/music/beasts-of-thunder.mp3', cover: '/assets/locations/palace-exterior.png', color: '#ffb267' },
  { title: 'Aisha Lullaby', mood: 'Soft royal tenderness and hidden memory.', src: '/assets/music/aisha-lullaby.mp3', cover: '/assets/pdf-characters/main-protagonists/main-protagonists-p02-01.png', color: '#f8f1ca' },
  { title: 'Altair Flight', mood: 'Comic urgent messenger chase.', cover: '/assets/pdf-characters/main-protagonists/main-protagonists-p15-01.png', color: '#c7b8ff' },
  { title: 'Niura’s Moon', mood: 'Tiny hope rescued from a golden cage.', cover: '/assets/pdf-characters/main-protagonists/main-protagonists-p07-04.png', color: '#f8f1ca' },
  { title: 'Dora’s Lazy Wisdom', mood: 'Royal panther comedy and warmth.', cover: '/assets/pdf-characters/main-protagonists/main-protagonists-p04-02.png', color: '#ffd1a6' },
  { title: 'The Ring Awakens', mood: 'Mystery object and first destiny pulse.', cover: '/assets/locations/bedouin-wonder-tent-grid.png', color: '#9de7ff' },
  { title: 'Silent City Lament', mood: 'Memory, loss, and buried history.', cover: '/assets/locations/aisha-locations.png', color: '#d6d2ff' },
  { title: 'Sands of Destiny Finale', mood: 'Full orchestra and restored balance.', cover: '/assets/locations/palace-exterior.png', color: '#f7d978' },
]

const merchProducts: MerchProduct[] = [
  {
    title: 'Aisha Deluxe Fashion Doll',
    subtitle: 'Royal wardrobe / festival edition',
    images: ['/assets/merch/aisha/aisha-lavender-box.png', '/assets/merch/aisha/aisha-royal-blue-box.png'],
    copy: 'Premium doll line with palace, market, and gala looks, plus a darker Cannes-style collector package with gold filigree shelf presence.',
    features: ['Two luxury package variants', 'Interchangeable royal looks', 'Tiny moonstone talisman', 'Collector window box'],
  },
  {
    title: 'Dora Royal Panther Plush',
    subtitle: 'Lazy guardian / luxury companion box',
    images: ['/assets/merch/dora/dora-gold-plush.png', '/assets/merch/dora/dora-boxed-plush.png'],
    copy: 'Soft white panther plush with a golden amulet collar, royal cushion, gift-box direction, and enough lazy attitude to sell the character in one glance.',
    features: ['Two plush campaign variants', 'Sun amulet collar', 'Royal cushion insert', 'Comic voice-chip option'],
  },
  {
    title: 'Niura Moon Bracelet Companion',
    subtitle: 'Wearable creature toy',
    images: ['/assets/pdf-characters/main-protagonists/main-protagonists-p07-04.png'],
    copy: 'Elastic coil companion concept: Niura wraps like a bracelet, with changeable forehead markings and moon-glitter stickers.',
    features: ['Coil bracelet body', 'Glitter head decals', 'Moonstone charm', 'Arabesque gem-art puzzle'],
  },
  {
    title: 'Sharak + Nibzu Villain Pack',
    subtitle: 'Shadow king theatre set',
    images: ['/assets/pdf-characters/antagonists/antagonists-p08-02.png'],
    copy: 'A dramatic villain shelf piece: Sharak with plasma accessories, Nibzu sidekick, and a mini alchemy table.',
    features: ['Plasma effect hands', 'Nibzu spider figure', 'Talisman accessory', 'Alchemy throne-room base'],
  },
  {
    title: 'Tamlun Desert Crossing Plush',
    subtitle: 'Giant travel companion',
    images: ['/assets/pdf-characters/side-characters/side-characters-p14-02.png'],
    copy: 'A big tactile creature plush with saddle details, caravan accessories, and soft fantasy-beast proportions.',
    features: ['Oversized plush body', 'Removable saddle', 'Travel blanket', 'Desert-crossing sound tag'],
  },
  {
    title: 'Maz-Khar Wing Builder',
    subtitle: 'Animatronic creature concept',
    images: ['/assets/pdf-characters/antagonists/antagonists-p14-01.png'],
    copy: 'A modular electronic creature toy: attach wings, saddle, and light patterns, then trigger wing flaps and hover-display mode.',
    features: ['Attachable wings', 'LED pattern plates', 'Wing-flap motion', 'Display hover stand'],
  },
]

const categoryTitles: Record<CharacterCategory, string> = {
  protagonists: 'Light Side: Main Protagonists',
  antagonists: 'Dark Side: Antagonists',
  sidekicks: 'Allies, Creatures & Side Characters',
}

function buildScriptBook(rawPages: BookPage[]) {
  const joined = rawPages.map((page) => page.text).join('\n\n')
  const normalized = joined
    .replace(/\u2028/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
  const firstAct = normalized.search(/\bACT\s+1\b/i)
  const rest = firstAct > 0 ? normalized.slice(firstAct).trim() : normalized.trim()
  const actBlocks = rest.split(/(?=\bACT\s+\d+\b)/i).filter(Boolean)
  const pages: BookPage[] = []
  const jumps: { label: string; page: number }[] = []
  const seenActs = new Set<string>()
  const maxPageLines = 30

  const pushPage = (text: string, blank = false) => {
    pages.push({ blank, page: pages.length + 1, text })
  }

  const estimateLineCost = (text: string) => {
    const line = text.trim()
    if (!line) return 0.4
    if (/^ACT\s+\d+/i.test(line)) return 3.25
    if (/^(INT\.|EXT\.|SONG SEQUENCE|VERSE|CHORUS|PRE-CHORUS|FINAL CHORUS|FADE OUT|END OF ACT)/i.test(line)) return 1.35
    if (/^[A-Z][A-Z\s#.'-]{2,}:?$/.test(line) && line.length < 42) return 1.15
    return Math.max(1.15, Math.ceil(line.length / 62) * 1.12)
  }

  const paginateBlocks = (blocks: string[]) => {
    let currentBlocks: string[] = []
    let currentLines = 0

    blocks.forEach((block) => {
      const blockLines = block.split('\n').reduce((total, line) => total + estimateLineCost(line), 0)
      const spacingLines = currentBlocks.length ? 0.45 : 0
      const wouldOverflow = currentLines + spacingLines + blockLines > maxPageLines

      if (wouldOverflow && currentBlocks.length) {
        pushPage(currentBlocks.join('\n\n'))
        currentBlocks = [block]
        currentLines = blockLines
        return
      }

      currentBlocks.push(block)
      currentLines += spacingLines + blockLines
    })

    if (currentBlocks.length) pushPage(currentBlocks.join('\n\n'))
  }

  actBlocks.forEach((block, index) => {
    if (block.trim().length < 80) return
    const actMatch = block.match(/\bACT\s+(\d+)\b/i)
    const label = actMatch ? `Act ${actMatch[1]}` : `Act ${index + 1}`
    const actNumber = actMatch?.[1] ?? String(index + 1)
    if (seenActs.has(actNumber)) return
    seenActs.add(actNumber)
    jumps.push({ label, page: pages.length + 1 })

    const trimmedBlock = block.trim()
    const actLineMatch = trimmedBlock.match(/^ACT\s+\d+[^\n]*/i)
    const actLine = actLineMatch?.[0].trim().replace(/\s+/g, ' ') || label.toUpperCase()
    let body = trimmedBlock.slice(actLineMatch?.[0].length || 0).replace(/^\s+/, '')
    const titleMatch = body.match(/^([A-Z][A-Z\s:'-]{4,})\s*(?:\n|$)/)
    const titleCandidate = titleMatch?.[1].trim() || ''
    const hasActTitle = Boolean(titleCandidate) && !/^(INT\.|EXT\.|SONG SEQUENCE|VERSE|CHORUS|PRE-CHORUS|FINAL CHORUS)/i.test(titleCandidate)
    const titleLine = hasActTitle ? titleCandidate.replace(/\s+/g, ' ') : ''
    if (hasActTitle && titleMatch) body = body.slice(titleMatch[0].length).trim()
    const actHeading = titleLine ? `${actLine} ${titleLine}` : actLine
    const paragraphs = body.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
    paginateBlocks([actHeading, ...paragraphs])
  })

  return { jumps, pages }
}

function buildSimpleBook(rawPages: BookPage[]) {
  return rawPages.map((page, index) => ({ ...page, page: index + 1 }))
}

function App() {
  const normalizeShowcaseCharacters = (saved: CharacterProfile[]): CharacterProfile[] => {
    const seen = new Set(saved.map((profile) => profile.id))
    const missing = characters.filter((profile) => !seen.has(profile.id))
    const migrated = [...saved, ...missing].map((profile) => {
      if (profile.id === 'plasma-character' && profile.image === '/assets/characters/plasma-djinn-full.png') {
        return { ...profile, image: '/assets/characters/plasma-character-idle.mp4', imagePlacement: { x: 0, y: 0, scale: 1 } }
      }
      if (profile.id === 'oracle' && profile.image === '/assets/pdf-characters/antagonists/antagonists-p04-01.png') {
        return { ...profile, image: '/assets/character-cutouts/oracle.png', imagePlacement: { x: 0, y: 0, scale: 1 } }
      }
      if (profile.id === 'mir-kaan' && profile.image === '/assets/pdf-characters/antagonists/antagonists-p06-02.png') {
        return { ...profile, image: '/assets/character-cutouts/mir-kaan.png', imagePlacement: { x: 0, y: 0, scale: 1 } }
      }
      if (profile.id === 'maz-khar' && profile.image === '/assets/pdf-characters/antagonists/antagonists-p14-01.png') {
        return { ...profile, image: '/assets/character-cutouts/maz-khar.png', imagePlacement: { x: 0, y: 0, scale: 1 } }
      }
      if (profile.id === 'mirage-perfume-seller' && profile.category !== 'antagonists') {
        return { ...profile, category: 'antagonists' }
      }
      return profile
    })
    const perfumeIndex = migrated.findIndex((profile) => profile.id === 'mirage-perfume-seller')
    const vizierIndex = migrated.findIndex((profile) => profile.id === 'mirage-vizier')
    if (perfumeIndex >= 0 && vizierIndex >= 0 && perfumeIndex !== vizierIndex + 1) {
      const [perfume] = migrated.splice(perfumeIndex, 1)
      const insertAfter = migrated.findIndex((profile) => profile.id === 'mirage-vizier')
      migrated.splice(insertAfter + 1, 0, { ...perfume, category: 'antagonists' })
    }
    return migrated
  }

  const loadShowcaseState = <T,>(key: string, fallback: T): T => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) as T : fallback
    } catch {
      return fallback
    }
  }
  const [route, setRoute] = useState(() => window.location.hash || '#hero')
  const [showcaseHero, setShowcaseHero] = useState<ShowcaseMedia[]>(() => loadShowcaseState('aisha-showcase-hero', defaultShowcaseHero))
  const [showcaseGallery, setShowcaseGallery] = useState<ShowcaseMedia[]>(() => loadShowcaseState('aisha-showcase-gallery', defaultShowcaseGallery))
  const [showcaseCharacters, setShowcaseCharacters] = useState<CharacterProfile[]>(() => normalizeShowcaseCharacters(loadShowcaseState('aisha-showcase-characters', characters)))
  const [showcaseCopy, setShowcaseCopy] = useState<ShowcaseCopy>(() => loadShowcaseState('aisha-showcase-copy', defaultShowcaseCopy))
  const [showcaseActNames, setShowcaseActNames] = useState<string[]>(() => loadShowcaseState('aisha-showcase-act-names', actNames))
  const [showcaseCategoryTitles, setShowcaseCategoryTitles] = useState<Record<CharacterCategory, string>>(() => loadShowcaseState('aisha-showcase-category-titles', categoryTitles))
  const [showcaseMerch, setShowcaseMerch] = useState<MerchProduct[]>(() => loadShowcaseState('aisha-showcase-merch', merchProducts))
  const [showcaseContact, setShowcaseContact] = useState(() => loadShowcaseState('aisha-showcase-contact', {
    title: 'Spain / Los Angeles',
    intro: 'Interactive production route for BrightBox Animations, based in Spain and Los Angeles.',
    lines: [
      'Spain: Madrid / Barcelona creative base',
      'Los Angeles: 1111 Sunset Blvd, Los Angeles, CA',
      'Fantastic film animation, music, cinematic AI production',
    ],
    email: 'brightbox.animations@gmail.com',
  }))
  const [activeHero, setActiveHero] = useState(0)
  const [heroPlaying, setHeroPlaying] = useState(false)
  const [scriptPages, setScriptPages] = useState<BookPage[]>([])
  const [songPages, setSongPages] = useState<BookPage[]>([])
  const [scriptJumps, setScriptJumps] = useState<{ label: string; page: number }[]>([])
  const [bookMode, setBookMode] = useState<'script' | 'songs'>('script')
  const [bookTheme, setBookTheme] = useState<'dark' | 'light'>('dark')
  const [bookPage, setBookPage] = useState(0)
  const [pageInput, setPageInput] = useState('1')
  const [activeCharacters, setActiveCharacters] = useState<Record<CharacterCategory, string>>({
    protagonists: 'aisha',
    antagonists: 'sharak',
    sidekicks: 'zafra',
  })
  const [characterTabs, setCharacterTabs] = useState<Record<CharacterCategory, 'description' | 'traits' | 'video'>>({
    protagonists: 'description',
    antagonists: 'description',
    sidekicks: 'description',
  })
  const [activeAct, setActiveAct] = useState(0)
  const [showcaseLightbox, setShowcaseLightbox] = useState<number | null>(null)
  const [activeTrack, setActiveTrack] = useState(0)
  const [activeMerchVariants, setActiveMerchVariants] = useState<Record<string, number>>({})
  const [mapFocus, setMapFocus] = useState<'spain' | 'la'>('spain')
  const [showcasePickerTarget, setShowcasePickerTarget] = useState<ShowcasePickerTarget | null>(null)
  const [showcasePickerStoryboard, setShowcasePickerStoryboard] = useState<StoryboardData | null>(null)
  const heroVideoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => { window.localStorage.setItem('aisha-showcase-hero', JSON.stringify(showcaseHero)) }, [showcaseHero])
  useEffect(() => { window.localStorage.setItem('aisha-showcase-gallery', JSON.stringify(showcaseGallery)) }, [showcaseGallery])
  useEffect(() => { window.localStorage.setItem('aisha-showcase-characters', JSON.stringify(showcaseCharacters)) }, [showcaseCharacters])
  useEffect(() => { window.localStorage.setItem('aisha-showcase-copy', JSON.stringify(showcaseCopy)) }, [showcaseCopy])
  useEffect(() => { window.localStorage.setItem('aisha-showcase-act-names', JSON.stringify(showcaseActNames)) }, [showcaseActNames])
  useEffect(() => { window.localStorage.setItem('aisha-showcase-category-titles', JSON.stringify(showcaseCategoryTitles)) }, [showcaseCategoryTitles])
  useEffect(() => { window.localStorage.setItem('aisha-showcase-merch', JSON.stringify(showcaseMerch)) }, [showcaseMerch])
  useEffect(() => { window.localStorage.setItem('aisha-showcase-contact', JSON.stringify(showcaseContact)) }, [showcaseContact])

  useEffect(() => {
    const syncRoute = () => setRoute(window.location.hash || '#hero')
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/assets/documents/script-pages.json').then((response) => response.json()),
      fetch('/assets/documents/song-pages.json').then((response) => response.json()),
    ]).then(([scriptData, songData]) => {
      const preparedScript = buildScriptBook(scriptData)
      setScriptPages(preparedScript.pages)
      setScriptJumps(preparedScript.jumps)
      setSongPages(buildSimpleBook(songData))
    })
  }, [])

  useEffect(() => {
    if (heroPlaying) return
    const timer = window.setInterval(() => {
      setActiveHero((slide) => (slide + 1) % Math.max(1, showcaseHero.length))
    }, 6200)
    return () => window.clearInterval(timer)
  }, [heroPlaying, showcaseHero.length])

  const pages = bookMode === 'script' ? scriptPages : songPages
  const openPages = [pages[bookPage], pages[bookPage + 1]].filter(Boolean)
  const currentHero = showcaseHero[activeHero] || showcaseHero[0] || defaultShowcaseHero[0]
  const activeShowcaseMedia = showcaseLightbox === null ? null : showcaseGallery[showcaseLightbox]

  const moveShowcaseLightbox = (direction: -1 | 1) => {
    setShowcaseLightbox((current) => {
      if (current === null || showcaseGallery.length === 0) return current
      return (current + direction + showcaseGallery.length) % showcaseGallery.length
    })
  }

  const playPrimaryTrailer = () => {
    if (currentHero.kind !== 'video') {
      const firstVideoIndex = showcaseHero.findIndex((slide) => slide.kind === 'video')
      if (firstVideoIndex >= 0) setActiveHero(firstVideoIndex)
    }
    window.setTimeout(() => {
      heroVideoRef.current?.play().catch(() => {})
    }, currentHero.kind === 'video' ? 0 : 220)
  }

  const switchHero = (index: number) => {
    setHeroPlaying(false)
    setActiveHero(index)
  }

  const uploadShowcaseFile = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/storyboard/upload', { method: 'POST', body: formData })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Upload failed')
    return {
      id: makeId('showcase'),
      title: 'Title',
      caption: 'Description',
      description: 'Description',
      src: payload.url,
      kind: file.type.startsWith('video') ? 'video' : 'image',
    } as ShowcaseMedia
  }

  const updateShowcaseHeroMedia = (index: number, patch: Partial<ShowcaseMedia>) => {
    setShowcaseHero((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  const updateShowcaseGalleryMedia = (index: number, patch: Partial<ShowcaseMedia>) => {
    setShowcaseGallery((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  const saveShowcaseCharacters = (updater: (current: CharacterProfile[]) => CharacterProfile[]) => {
    setShowcaseCharacters((current) => {
      const next = updater(current)
      window.localStorage.setItem('aisha-showcase-characters', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    saveShowcaseCharacters((current) => current.map((profile) => (
      profile.id === 'plasma-character' && profile.image === '/assets/characters/plasma-djinn-full.png'
        ? { ...profile, image: '/assets/characters/plasma-character-idle.mp4', imagePlacement: { x: 0, y: 0, scale: 1 } }
        : profile.id === 'mirage-perfume-seller' && profile.category !== 'antagonists'
          ? { ...profile, category: 'antagonists' }
          : profile
    )))
  }, [])

  const updateShowcaseCharacter = (id: string, patch: Partial<CharacterProfile>) => {
    saveShowcaseCharacters((current) => current.map((profile) => profile.id === id ? { ...profile, ...patch } : profile))
  }

  const addShowcaseCharacter = (category: CharacterCategory) => {
    const nextId = makeId(`character-${category}`)
    const starter: CharacterProfile = {
      id: nextId,
      category,
      name: 'New Character',
      role: 'Role',
      image: '',
      imagePlacement: { x: 0, y: 0, scale: 1 },
      description: 'Description',
      traits: ['Trait'],
      backstory: 'Backstory',
    }
    saveShowcaseCharacters((current) => [...current, starter])
    setActiveCharacters((current) => ({ ...current, [category]: nextId }))
    setCharacterTabs((current) => ({ ...current, [category]: 'description' }))
  }

  const reorderShowcaseCharacter = (dragId: string, targetId: string) => {
    if (dragId === targetId) return
    saveShowcaseCharacters((current) => {
      const from = current.findIndex((profile) => profile.id === dragId)
      const to = current.findIndex((profile) => profile.id === targetId)
      if (from < 0 || to < 0) return current
      const next = [...current]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const updateShowcaseText = (key: string, value: string) => {
    setShowcaseCopy((current) => ({ ...current, [key]: value }))
  }

  const updateShowcaseActName = (index: number, value: string) => {
    setShowcaseActNames((current) => current.map((name, itemIndex) => itemIndex === index ? (value || name) : name))
  }

  const updateShowcaseMerch = (index: number, patch: Partial<MerchProduct>) => {
    setShowcaseMerch((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  const mediaFromPicker = (media: StoryboardMedia): ShowcaseMedia => ({
    id: makeId('showcase'),
    title: 'Title',
    caption: 'Description',
    description: 'Description',
    src: media.url,
    kind: media.type === 'video' ? 'video' : 'image',
  })

  const placeShowcaseMedia = (media: ShowcaseMedia, targetInfo = showcasePickerTarget) => {
    if (!targetInfo) return
    if (targetInfo.target === 'hero') {
      setShowcaseHero((current) => {
        const next = [...current]
        if (typeof targetInfo.index === 'number') next.splice(targetInfo.index, 1, media)
        else next.push(media)
        return next
      })
      return
    }
    setShowcaseGallery((current) => {
      const next = [...current]
      if (typeof targetInfo.index === 'number') next.splice(targetInfo.index, 1, media)
      else next.push(media)
      return next
    })
  }

  const openShowcasePicker = (target: 'hero' | 'gallery', index?: number) => {
    setShowcasePickerTarget({ target, index })
    if (!showcasePickerStoryboard) {
      fetch('/api/storyboard')
        .then((response) => response.json())
        .then((payload) => setShowcasePickerStoryboard(normalizeStoryboard(payload)))
        .catch(() => setShowcasePickerStoryboard(createDefaultStoryboard()))
    }
  }

  const addShowcaseFiles = async (files: File[], target: 'hero' | 'gallery', replaceIndex?: number) => {
    if (!files.length) return
    const uploaded = await Promise.all(files.map(uploadShowcaseFile))
    if (target === 'hero') {
      setShowcaseHero((current) => {
        const next = [...current]
        if (typeof replaceIndex === 'number') next.splice(replaceIndex, 1, ...uploaded)
        else next.push(...uploaded)
        return next.length ? next : defaultShowcaseHero
      })
      return
    }
    setShowcaseGallery((current) => {
      const next = [...current]
      if (typeof replaceIndex === 'number') next.splice(replaceIndex, 1, ...uploaded)
      else next.push(...uploaded)
      return next.length ? next : defaultShowcaseGallery
    })
  }

  const replaceCharacterImage = async (profileId: string, file: File) => {
    const uploaded = await uploadShowcaseFile(file)
    saveShowcaseCharacters((current) => current.map((profile) => profile.id === profileId ? { ...profile, image: uploaded.src, imagePlacement: { x: 0, y: 0, scale: 1 } } : profile))
  }

  const replaceCharacterPresentationVideo = async (profileId: string, file: File) => {
    const uploaded = await uploadShowcaseFile(file)
    saveShowcaseCharacters((current) => current.map((profile) => profile.id === profileId ? {
      ...profile,
      videoPresentation: uploaded.src,
      videoPlacement: { x: 0, y: 0, scale: 1 },
      videoMuted: false,
    } : profile))
  }

  const captureShowcaseMedia = (media: ShowcaseMedia | { src?: string; image?: string; title?: string; name?: string }) => {
    const src = 'kind' in media && media.kind === 'video'
      ? media.poster
      : ('src' in media && media.src ? media.src : ('image' in media ? media.image : undefined))
    if (!src) return
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1920
      canvas.height = 1080
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const radius = 96
      ctx.beginPath()
      ctx.moveTo(radius, 0)
      ctx.lineTo(canvas.width - radius, 0)
      ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius)
      ctx.lineTo(canvas.width, canvas.height - radius)
      ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height)
      ctx.lineTo(radius, canvas.height)
      ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius)
      ctx.lineTo(0, radius)
      ctx.quadraticCurveTo(0, 0, radius, 0)
      ctx.clip()
      const scale = Math.max(canvas.width / image.width, canvas.height / image.height)
      const width = image.width * scale
      const height = image.height * scale
      ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
      const link = document.createElement('a')
      link.download = `${('title' in media ? media.title : media.name) || 'showcase-frame'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    image.src = src
  }

  const captureShowcaseElement = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId)
    if (!element) return
    const previousDataCapture = element.getAttribute('data-capturing')
    element.setAttribute('data-capturing', 'true')
    try {
      const { default: html2canvas } = await import('html2canvas')
      const rect = element.getBoundingClientRect()
      const canvas = await html2canvas(element, {
        backgroundColor: '#071523',
        width: rect.width,
        height: rect.height,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        scrollX: 0,
        scrollY: -window.scrollY,
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        useCORS: true,
        allowTaint: true,
        imageTimeout: 15000,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `${fileName.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'aisha-panel'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Panel capture failed:', error)
    } finally {
      if (previousDataCapture === null) element.removeAttribute('data-capturing')
      else element.setAttribute('data-capturing', previousDataCapture)
    }
  }

  const switchBook = (mode: 'script' | 'songs') => {
    setBookMode(mode)
    setBookPage(0)
    setPageInput('1')
  }

  const goToBookPage = (page: number) => {
    const safePage = Math.max(1, Math.min(page, pages.length || 1))
    setBookPage(safePage - 1)
    setPageInput(String(safePage))
  }

  const submitPage = () => {
    goToBookPage(Number(pageInput) || 1)
  }

  if (route === '#storyboard') return <StoryboardWorkspace />

  return (
    <main className="showcase">
      <div className="mandala-field" aria-hidden="true" />
      <div className="ambient-dust" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#hero" aria-label="Aisha showcase home">
          <span>A</span>
          <strong>Aisha</strong>
        </a>
        <nav>
          <a href="#hero">Trailers</a>
          <a href="#gallery">Art</a>
          <a href="#characters">Characters</a>
          <a href="#score">Score</a>
          <a href="#storyboard">Storyboard</a>
          <a href="#merch">Merch</a>
          <a href="#book">Book</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section className="hero" id="hero">
        <div className="hero-stage glass">
          <div className="showcase-edit-tools hero-edit-tools">
            <label title="Replace this hero media">
              +
              <input type="file" accept="image/*,video/*" multiple onChange={(event) => {
                addShowcaseFiles(Array.from(event.target.files || []), 'hero', activeHero).catch(() => {})
                event.target.value = ''
              }} />
            </label>
            <button title="Delete this hero slide" type="button" onClick={() => {
              setShowcaseHero((current) => {
                const next = current.filter((_, index) => index !== activeHero)
                setActiveHero(0)
                return next.length ? next : defaultShowcaseHero
              })
            }}>×</button>
          </div>
          <div className="hero-media">
            {currentHero.kind === 'video' ? (
              <video
                ref={heroVideoRef}
                src={currentHero.src}
                poster={currentHero.poster}
                controls
                playsInline
                onPause={() => setHeroPlaying(false)}
                onPlay={() => setHeroPlaying(true)}
              />
            ) : (
              <img src={currentHero.src} alt={currentHero.title} />
            )}
            <div className="hero-vignette" />
          </div>
          <div className="hero-status">
            <span>{String(activeHero + 1).padStart(2, '0')} / {String(showcaseHero.length).padStart(2, '0')}</span>
            <div className="hero-dots">
              {showcaseHero.map((slide, index) => (
                <button aria-label={`Show ${slide.kicker}`} className={activeHero === index ? 'is-active' : ''} key={slide.id} onClick={() => switchHero(index)} type="button" />
              ))}
            </div>
          </div>
          <div className="hero-copy">
            <p className="eyebrow editable-copy" contentEditable suppressContentEditableWarning onBlur={(event) => updateShowcaseHeroMedia(activeHero, { kicker: event.currentTarget.textContent || 'Trailer' })}>{currentHero.kicker || 'Trailer'}</p>
            <h1 className="editable-copy hero-title-clamp" contentEditable suppressContentEditableWarning onBlur={(event) => updateShowcaseHeroMedia(activeHero, { title: event.currentTarget.textContent || 'Title' })}>{currentHero.title || 'Title'}</h1>
            <p className="editable-copy hero-caption-clamp" contentEditable suppressContentEditableWarning onBlur={(event) => updateShowcaseHeroMedia(activeHero, { caption: event.currentTarget.textContent || 'Description' })}>{currentHero.caption || 'Description'}</p>
            <div className="hero-actions">
              <button className="gold-button" onClick={playPrimaryTrailer} type="button">Press play</button>
              <a className="ghost-button" href="#book">Open story bible</a>
            </div>
          </div>
        </div>

        <div className="hero-strip" aria-label="Hero carousel">
          {showcaseHero.map((slide, index) => (
            <button className={`hero-thumb ${activeHero === index ? 'is-active' : ''}`} key={slide.id} onClick={() => switchHero(index)} type="button">
              <span>{slide.kicker || 'Trailer'}</span>
              <strong>{slide.title || 'Title'}</strong>
            </button>
          ))}
          <label className="hero-strip-add-dot" title="Add hero media">
            +
            <input type="file" accept="image/*,video/*" multiple onChange={(event) => {
              addShowcaseFiles(Array.from(event.target.files || []), 'hero').catch(() => {})
              event.target.value = ''
            }} />
          </label>
        </div>
      </section>

      <section className="section" id="gallery">
        <SectionTitle
          eyebrow={showcaseCopy.artEyebrow ?? defaultShowcaseCopy.artEyebrow}
          title={showcaseCopy.artTitle ?? defaultShowcaseCopy.artTitle}
          copy={showcaseCopy.artCopy ?? defaultShowcaseCopy.artCopy}
          onEdit={(part, value) => updateShowcaseText(`art${part[0].toUpperCase()}${part.slice(1)}`, value)}
        />
        <div className="act-menu" aria-label="Choose act gallery">
          {showcaseActNames.map((act, index) => (
            <button className={activeAct === index ? 'is-active' : ''} key={`${act}-${index}`} onClick={() => setActiveAct(index)} type="button">
              <span
                className="editable-copy"
                contentEditable
                suppressContentEditableWarning
                onClick={(event) => event.stopPropagation()}
                onBlur={(event) => updateShowcaseActName(index, event.currentTarget.textContent || act)}
              >
                {act}
              </span>
            </button>
          ))}
        </div>
        <div
          className="act-grid"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            addShowcaseFiles(Array.from(event.dataTransfer.files || []), 'gallery').catch(() => {})
          }}
        >
          {showcaseGallery.map((item, index) => (
            <article
              className="act-card glass editable-media-card"
              key={`${showcaseActNames[activeAct] || actNames[activeAct]}-${item.id}-${index}`}
              onClick={() => setShowcaseLightbox(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                addShowcaseFiles(Array.from(event.dataTransfer.files || []), 'gallery', index).catch(() => {})
              }}
            >
              {item.kind === 'video' ? <video src={item.src} muted playsInline /> : <img src={item.src} alt={item.title} />}
              <div className="showcase-edit-tools" onClick={(event) => event.stopPropagation()}>
                <button title="Replace or add here" type="button" onClick={() => openShowcasePicker('gallery', index)}>
                  +
                </button>
                <button title="Delete" type="button" onClick={() => setShowcaseGallery((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>
              </div>
              <div>
                <span>{showcaseActNames[activeAct] || actNames[activeAct]} / Frame {String(index + 1).padStart(2, '0')}</span>
                <h3 className="editable-copy card-title-clamp" contentEditable suppressContentEditableWarning onClick={(event) => event.stopPropagation()} onBlur={(event) => updateShowcaseGalleryMedia(index, { title: event.currentTarget.textContent || 'Title' })}>{item.title || 'Title'}</h3>
              </div>
            </article>
          ))}
          <button className="gallery-add-mini" type="button" onClick={() => openShowcasePicker('gallery')} title="Add art or video">+</button>
        </div>
      </section>

      {activeShowcaseMedia && (
        <div className="public-art-lightbox" onClick={() => setShowcaseLightbox(null)} role="presentation">
          <button className="public-art-close" type="button" aria-label="Close gallery view" onClick={() => setShowcaseLightbox(null)}>×</button>
          <button className="public-art-arrow left" type="button" aria-label="Previous artwork" onClick={(event) => { event.stopPropagation(); moveShowcaseLightbox(-1) }}>‹</button>
          <div
            className="public-art-frame glass"
            onClick={(event) => event.stopPropagation()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              addShowcaseFiles(Array.from(event.dataTransfer.files || []), 'gallery', showcaseLightbox || 0).catch(() => {})
            }}
          >
            <div className="public-art-media">
              <div className="public-art-overlay-tools">
                <button type="button" title="Replace media" onClick={() => openShowcasePicker('gallery', showcaseLightbox || 0)}>+</button>
                <button type="button" title="Capture rounded frame" onClick={() => captureShowcaseMedia(activeShowcaseMedia)}>□</button>
              </div>
              {activeShowcaseMedia.kind === 'video' ? (
                <video src={activeShowcaseMedia.src} poster={activeShowcaseMedia.poster} controls autoPlay playsInline />
              ) : (
                <img src={activeShowcaseMedia.src} alt={activeShowcaseMedia.title} />
              )}
            </div>
            <div className="public-art-copy">
              <span
                className="editable-copy"
                contentEditable
                suppressContentEditableWarning
                onBlur={(event) => updateShowcaseGalleryMedia(showcaseLightbox || 0, { kicker: event.currentTarget.textContent || 'Showcase Frame' })}
              >
                {activeShowcaseMedia.kicker || `${showcaseActNames[activeAct] || actNames[activeAct]} / Showcase Frame ${String((showcaseLightbox || 0) + 1).padStart(2, '0')}`}
              </span>
              <h3 className="editable-copy public-art-title-clamp" contentEditable suppressContentEditableWarning onBlur={(event) => updateShowcaseGalleryMedia(showcaseLightbox || 0, { title: event.currentTarget.textContent || 'Title' })}>{activeShowcaseMedia.title || 'Title'}</h3>
              <p className="editable-copy public-art-desc-clamp" contentEditable suppressContentEditableWarning onBlur={(event) => updateShowcaseGalleryMedia(showcaseLightbox || 0, { description: event.currentTarget.textContent || 'Description' })}>{activeShowcaseMedia.description || activeShowcaseMedia.caption || 'Description'}</p>
            </div>
          </div>
          <button className="public-art-arrow right" type="button" aria-label="Next artwork" onClick={(event) => { event.stopPropagation(); moveShowcaseLightbox(1) }}>›</button>
        </div>
      )}

      <section className="section cast-section" id="characters">
        <SectionTitle
          eyebrow={showcaseCopy.charactersEyebrow ?? defaultShowcaseCopy.charactersEyebrow}
          title={showcaseCopy.charactersTitle ?? defaultShowcaseCopy.charactersTitle}
          copy={showcaseCopy.charactersCopy ?? defaultShowcaseCopy.charactersCopy}
          onEdit={(part, value) => updateShowcaseText(`characters${part[0].toUpperCase()}${part.slice(1)}`, value)}
        />
        {(['protagonists', 'antagonists', 'sidekicks'] as CharacterCategory[]).map((category) => (
          <CharacterSection
            activeId={activeCharacters[category]}
            activeTab={characterTabs[category]}
            category={category}
            key={category}
            onAdd={() => addShowcaseCharacter(category)}
            onPick={(id) => {
              setActiveCharacters((current) => ({ ...current, [category]: id }))
              setCharacterTabs((current) => ({ ...current, [category]: 'description' }))
            }}
            onReorder={reorderShowcaseCharacter}
            onTab={(tab) => setCharacterTabs((current) => ({ ...current, [category]: tab }))}
            onDeleteImage={(id) => saveShowcaseCharacters((current) => current.map((profile) => profile.id === id ? { ...profile, image: '', imagePlacement: { x: 0, y: 0, scale: 1 } } : profile))}
            onUpdateCategoryTitle={(value) => setShowcaseCategoryTitles((current) => ({ ...current, [category]: value || current[category] }))}
            onUpdateProfile={updateShowcaseCharacter}
            onUploadImage={(id, file) => replaceCharacterImage(id, file).catch(() => {})}
            onUploadPresentationVideo={(id, file) => replaceCharacterPresentationVideo(id, file).catch(() => {})}
            onCapture={captureShowcaseElement}
            categoryTitle={showcaseCategoryTitles[category] || categoryTitles[category]}
            profiles={showcaseCharacters.filter((character) => character.category === category)}
          />
        ))}
      </section>

      <section className="section" id="score">
        <SectionTitle
          eyebrow={showcaseCopy.scoreEyebrow ?? defaultShowcaseCopy.scoreEyebrow}
          title={showcaseCopy.scoreTitle ?? defaultShowcaseCopy.scoreTitle}
          copy={showcaseCopy.scoreCopy ?? ''}
          onEdit={(part, value) => updateShowcaseText(`score${part[0].toUpperCase()}${part.slice(1)}`, value)}
        />
        <ScoreConsole activeTrack={activeTrack} onSelect={setActiveTrack} tracks={tracks} />
      </section>

      <section className="section" id="book">
        <SectionTitle
          eyebrow={showcaseCopy.bookEyebrow ?? defaultShowcaseCopy.bookEyebrow}
          title={showcaseCopy.bookTitle ?? defaultShowcaseCopy.bookTitle}
          copy={showcaseCopy.bookCopy ?? defaultShowcaseCopy.bookCopy}
          onEdit={(part, value) => updateShowcaseText(`book${part[0].toUpperCase()}${part.slice(1)}`, value)}
        />
        <div className={`book-console glass ${bookTheme}`}>
          <div className="book-toolbar">
            <div className="book-tabs">
              <button className={bookMode === 'script' ? 'is-active' : ''} onClick={() => switchBook('script')} type="button">Full Script</button>
              <button className={bookMode === 'songs' ? 'is-active' : ''} onClick={() => switchBook('songs')} type="button">Songs</button>
              <button className="theme-toggle" aria-label="Toggle book theme" onClick={() => setBookTheme(bookTheme === 'dark' ? 'light' : 'dark')} type="button">
                {bookTheme === 'dark' ? '☀' : '☾'}
              </button>
            </div>
            <div className="page-jump">
              <span>{pages.length ? `Pages ${bookPage + 1}-${Math.min(bookPage + 2, pages.length)} / ${pages.length}` : 'Loading book...'}</span>
              <input aria-label="Go to page" inputMode="numeric" onChange={(event) => setPageInput(event.target.value)} value={pageInput} />
              <button onClick={submitPage} type="button">Go</button>
            </div>
          </div>
          {bookMode === 'script' && (
            <div className="act-jumps">
              {scriptJumps.map(({ label, page }) => (
                <button key={`${label}-${page}`} onClick={() => goToBookPage(page)} type="button">{label}</button>
              ))}
            </div>
          )}
          <div className="book-spread" key={`${bookMode}-${bookTheme}-${bookPage}`}>
            {openPages.map((page) => (
              <article className={`book-page ${page.blank ? 'is-blank' : ''}`} key={page.page}>
                {page.blank ? <p className="blank-page-note">This page is intentionally left blank.</p> : <BookPageText text={page.text} />}
                <span className="book-page-number">{page.page}</span>
              </article>
            ))}
          </div>
          <button
            aria-label="Previous page"
            className="book-arrow book-arrow-left"
            onClick={() => goToBookPage(Math.max(1, bookPage - 1))}
            type="button"
            disabled={bookPage === 0}
          >
            ‹
          </button>
          <button
            aria-label="Next page"
            className="book-arrow book-arrow-right"
            onClick={() => goToBookPage(Math.min(pages.length, bookPage + 3))}
            type="button"
            disabled={bookPage + 2 >= pages.length}
          >
            ›
          </button>
        </div>
      </section>

      <section className="section" id="merch">
        <SectionTitle
          eyebrow={showcaseCopy.merchEyebrow ?? defaultShowcaseCopy.merchEyebrow}
          title={showcaseCopy.merchTitle ?? defaultShowcaseCopy.merchTitle}
          copy={showcaseCopy.merchCopy ?? defaultShowcaseCopy.merchCopy}
          onEdit={(part, value) => updateShowcaseText(`merch${part[0].toUpperCase()}${part.slice(1)}`, value)}
        />
        <div className="merch-campaigns">
          {showcaseMerch.map((product, index) => {
            const variant = activeMerchVariants[product.title] || 0
            const activeImage = product.images[variant] || product.images[0]

            return (
              <article className="merch-campaign glass" key={product.title}>
                <div className="merch-showcase">
                  <img src={activeImage} alt={product.title} />
                  {product.images.length > 1 && (
                    <div className="merch-variant-dots" aria-label={`${product.title} variants`}>
                      {product.images.map((image, dotIndex) => (
                        <button
                          aria-label={`Show variant ${dotIndex + 1}`}
                          className={variant === dotIndex ? 'is-active' : ''}
                          key={image}
                          onClick={() => setActiveMerchVariants((current) => ({ ...current, [product.title]: dotIndex }))}
                          type="button"
                        />
                      ))}
                    </div>
                  )}
                  <div className="campaign-video-slot">
                    <span>Campaign film slot</span>
                    <strong>{String(index + 1).padStart(2, '0')}</strong>
                  </div>
                </div>
                <div className="merch-campaign-copy">
                  <span className="editable-copy" contentEditable suppressContentEditableWarning onBlur={(event) => updateShowcaseMerch(index, { subtitle: event.currentTarget.textContent || product.subtitle })}>{product.subtitle}</span>
                  <h3 className="editable-copy" contentEditable suppressContentEditableWarning onBlur={(event) => updateShowcaseMerch(index, { title: event.currentTarget.textContent || product.title })}>{product.title}</h3>
                  <p className="editable-copy" contentEditable suppressContentEditableWarning onBlur={(event) => updateShowcaseMerch(index, { copy: event.currentTarget.textContent || product.copy })}>{product.copy}</p>
                  <ul>
                    {product.features.map((feature, featureIndex) => <li className="editable-copy" contentEditable suppressContentEditableWarning key={`${feature}-${featureIndex}`} onBlur={(event) => {
                      const features = [...product.features]
                      features[featureIndex] = event.currentTarget.textContent || feature
                      updateShowcaseMerch(index, { features })
                    }}>{feature}</li>)}
                  </ul>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="section contact-section" id="contact">
        <SectionTitle
          eyebrow={showcaseCopy.contactEyebrow ?? defaultShowcaseCopy.contactEyebrow}
          title={showcaseCopy.contactTitle ?? defaultShowcaseCopy.contactTitle}
          copy={showcaseCopy.contactCopy ?? defaultShowcaseCopy.contactCopy}
          onEdit={(part, value) => updateShowcaseText(`contact${part[0].toUpperCase()}${part.slice(1)}`, value)}
        />
        <div className="contact-panel glass">
          <div>
            <h3 contentEditable suppressContentEditableWarning onBlur={(event) => setShowcaseContact((current) => ({ ...current, title: event.currentTarget.textContent || current.title }))}>{showcaseContact.title}</h3>
            <p contentEditable suppressContentEditableWarning onBlur={(event) => setShowcaseContact((current) => ({ ...current, intro: event.currentTarget.textContent || current.intro }))}>{showcaseContact.intro}</p>
            <div className="contact-details">
              {showcaseContact.lines.map((line, index) => (
                <span key={index} contentEditable suppressContentEditableWarning onBlur={(event) => setShowcaseContact((current) => {
                  const lines = [...current.lines]
                  lines[index] = event.currentTarget.textContent || line
                  return { ...current, lines }
                })}>{line}</span>
              ))}
            </div>
            <div className="social-row">
              <a href="https://youtube.com" aria-label="YouTube">YT</a>
              <a href="https://instagram.com" aria-label="Instagram">IG</a>
              <a href="https://x.com" aria-label="X">X</a>
            </div>
            <a className="gold-button" href={`mailto:${showcaseContact.email}`} contentEditable suppressContentEditableWarning onBlur={(event) => setShowcaseContact((current) => ({ ...current, email: event.currentTarget.textContent || current.email }))}>{showcaseContact.email}</a>
          </div>
          <WorldMap focus={mapFocus} onFocus={setMapFocus} />
        </div>
      </section>
      <footer className="site-footer">
        © 2025–2026 BrightBox Animation Studios. All rights reserved.
      </footer>
      {showcasePickerTarget && (
        <ShowcaseMediaPicker
          storyboard={showcasePickerStoryboard}
          onClose={() => setShowcasePickerTarget(null)}
          onPick={(media) => {
            placeShowcaseMedia(mediaFromPicker(media))
            setShowcasePickerTarget(null)
          }}
          onUpload={(files) => {
            if (!showcasePickerTarget) return
            addShowcaseFiles(files, showcasePickerTarget.target, showcasePickerTarget.index).catch(() => {})
            setShowcasePickerTarget(null)
          }}
        />
      )}
    </main>
  )
}

/* Lightbox Skills Store Modal — exact replica of Director's Cut Skills Store */
function LbSkillStoreModal({ lbAvailableSkills, lbAttachedSkills, setLbAttachedSkills, setLbSkillOpen, setLbAvailableSkills, lbSkillsPage, setLbSkillsPage, onInjectPrompt, compact }: { lbAvailableSkills: any[]; lbAttachedSkills: { id: string; name: string }[]; setLbAttachedSkills: React.Dispatch<React.SetStateAction<{ id: string; name: string }[]>>; setLbSkillOpen: (v: boolean) => void; setLbAvailableSkills: React.Dispatch<React.SetStateAction<any[]>>; lbSkillsPage: number; setLbSkillsPage: (v: number) => void; onInjectPrompt?: (text: string) => void; compact?: boolean }) {
  const [storeTab, setStoreTab] = useState<'skills' | 'prompts'>('skills')
  const [lbEditPromptTitle, setLbEditPromptTitle] = useState('')
  const [lbEditPromptText, setLbEditPromptText] = useState('')
  const [lbEditPromptId, setLbEditPromptId] = useState<string | null>(null)
  const [lbPromptAiImproving, setLbPromptAiImproving] = useState(false)
  const PROMPT_SVGS = [
    { color: '#e8c547', d: 'M4 4h16v16H4zM4 12h16M12 4v16' },
    { color: '#47c5e8', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
    { color: '#c547e8', d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { color: '#47e88c', d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { color: '#e87847', d: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
    { color: '#4778e8', d: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
    { color: '#e8d447', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { color: '#e84777', d: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122' },
    { color: '#78e847', d: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    { color: '#47e8e8', d: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  ]
  const BUILTIN_PROMPTS = [
    { id: 'bp-cinematic-grid', name: '2×2 Cinematic Grid', icon: 0, desc: '4-panel premium 3D animated grid', text: 'premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric morning light, little tiny dust motes, in soft sunrays soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look\n\nCreate 2x2 cinematic grid with 4 panels with 3d animated scenes in each one:\n\nPanel 1: [character action, emotions, interaction. Camera/shot type. Light, background details]\nPanel 2: [describe]\nPanel 3: [describe]\nPanel 4: [describe]\n\nEnvironment: [describe main features]\n\nStyle: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric morning light, soft depth of field, expressive animated 3D eyes, realistic textures, detailed clear emotional staging, high-quality 4K animated movie look' },
    { id: 'bp-room-projections', name: '4 Room Projections', icon: 1, desc: 'Same room 4 camera angles in 2×2 grid', text: 'Show exact same room in four projections - 2x2 grid:\n\nPanel 1: Camera facing front. [describe wall, furniture, door, window]\nPanel 2: Camera close up facing left wall. [describe details]\nPanel 3: Top down view of the entire room. [describe layout]\nPanel 4: Camera angle from one side towards opposite wall. [describe perspective]\n\nAll panels must show SAME room, only camera angles change.\n\nStyle: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric light, expressive animated 3D eyes, realistic textures, high-quality 4K animated movie look' },
    { id: 'bp-quality-improve', name: 'Quality Improvement', icon: 2, desc: 'Enhance quality preserving composition', text: 'Use exact @img1 but improve quality of characters and resolution. Do not change camera angle, composition, architecture or objects. Characters remain in same poses, all objects in same places. Camera same angle as @img1 only improve quality.\n\nStyle: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric morning light, soft depth of field, expressive animated 3D eyes, realistic textures, detailed clear emotional staging, high-quality 4K animated movie look' },
  ]
  const SKILL_SVGS = [
    { color: '#d4af37', d: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
    { color: '#409cff', d: 'M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83' },
    { color: '#9c40ff', d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' },
    { color: '#40ff9c', d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
    { color: '#ff9c40', d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z' },
    { color: '#ff4090', d: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
    { color: '#40ffff', d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22V15' },
    { color: '#ffc840', d: 'M12 3v18M3 12h18M7.5 7.5l9 9M16.5 7.5l-9 9' },
    { color: '#a0ff40', d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3' },
    { color: '#ff6040', d: 'M13 2L3 14h9l-1 8 10-12h-9l1-8' },
  ]
  const getIcon = (idx: number) => SKILL_SVGS[idx % SKILL_SVGS.length]
  const totalPages = lbAvailableSkills.length <= 5 ? 1 : 1 + Math.ceil((lbAvailableSkills.length - 5) / 6)
  const page = Math.min(lbSkillsPage, totalPages - 1)
  const p1Count = Math.min(lbAvailableSkills.length, 5)
  const pageSkills = page === 0 ? lbAvailableSkills.slice(0, p1Count) : lbAvailableSkills.slice(p1Count + (page - 1) * 6, p1Count + page * 6)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }} onClick={() => setLbSkillOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: compact ? 'min(90vw, 560px)' : 'min(90vw, 900px)', maxHeight: compact ? '75vh' : '85vh', background: 'linear-gradient(145deg, rgba(20,20,30,0.95), rgba(10,10,20,0.98))', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '1.5rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(212,175,55,0.08), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
        {/* Header with Tabs */}
        <div style={{ padding: '1.2rem 2rem 0', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontWeight: 700 }}>{storeTab === 'skills' ? 'Skills Store' : 'Prompt Blueprints'}</h2>
            <button type="button" onClick={() => setLbSkillOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'rgba(255,255,255,0.5)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: '0.3rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {(['skills', 'prompts'] as const).map(t => (
              <button key={t} type="button" onClick={() => setStoreTab(t)} style={{ padding: '0.5rem 1.2rem', border: 'none', borderBottom: storeTab === t ? '2px solid var(--gold)' : '2px solid transparent', background: 'none', color: storeTab === t ? 'var(--gold)' : 'rgba(255,255,255,0.4)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>{t === 'skills' ? '⚡ Skills' : '📝 Prompts'}</button>
            ))}
          </div>
        </div>
        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        {storeTab === 'prompts' ? (
          /* ── Prompt Blueprints Tab with Edit/Create ── */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600, margin: 0 }}>Prompt Blueprints</p>
              {!compact && <button type="button" onClick={() => { setLbEditPromptId('__new__'); setLbEditPromptTitle(''); setLbEditPromptText('') }} style={{ padding: '0.35rem 0.8rem', borderRadius: '0.5rem', border: '1px solid rgba(64,255,156,0.25)', background: 'rgba(64,255,156,0.06)', color: 'rgba(100,255,180,0.75)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Create New</button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', gap: compact ? '0.6rem' : '1rem', marginBottom: compact ? '1rem' : '2rem' }}>
              {BUILTIN_PROMPTS.map((bp) => {
                const ic = PROMPT_SVGS[bp.icon % PROMPT_SVGS.length]
                return (
                  <button key={bp.id} type="button" onClick={() => { if (onInjectPrompt) { onInjectPrompt(bp.text); return } }} style={{ width: '100%', aspectRatio: '16/9', background: lbEditPromptId === bp.id ? `rgba(${parseInt(ic.color.slice(1,3),16)},${parseInt(ic.color.slice(3,5),16)},${parseInt(ic.color.slice(5,7),16)},0.08)` : `rgba(${parseInt(ic.color.slice(1,3),16)},${parseInt(ic.color.slice(3,5),16)},${parseInt(ic.color.slice(5,7),16)},0.06)`, backdropFilter: 'blur(16px)', border: lbEditPromptId === bp.id ? `1px solid ${ic.color}88` : `1px solid ${ic.color}44`, borderRadius: compact ? '0.75rem' : '1rem', padding: compact ? '0.6rem 0.5rem' : '1rem 0.8rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: compact ? '0.3rem' : '0.5rem', transition: 'all 0.3s', textAlign: 'center', boxShadow: lbEditPromptId === bp.id ? `0 0 24px ${ic.color}44` : `0 0 20px ${ic.color}22`, transform: lbEditPromptId === bp.id ? 'scale(1.04)' : 'scale(1)', position: 'relative' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={ic.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: compact ? '22px' : '36px', height: compact ? '22px' : '36px' }}><path d={ic.d} /></svg>
                    <div style={{ fontSize: compact ? '0.7rem' : '0.78rem', fontWeight: 600, color: 'white', lineHeight: 1.3, minHeight: compact ? 'calc(0.7rem * 1.3 * 2)' : 'calc(0.78rem * 1.3 * 2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{bp.name}</div>
                    {!compact && <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.3, minHeight: 'calc(0.62rem * 1.3 * 2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{bp.desc}</div>}
                    {!compact && <div className="prompt-edit-icon" onClick={(e) => { e.stopPropagation(); setLbEditPromptId(bp.id); setLbEditPromptTitle(bp.name); setLbEditPromptText(bp.text) }} style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', width: '1.6rem', height: '1.6rem', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center', opacity: 0, transition: 'opacity 0.2s', cursor: 'pointer' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>}
                  </button>
                )
              })}
              {/* Upload prompt file */}
              {!compact && <label style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '1rem', aspectRatio: '16/9', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textAlign: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>Upload Prompt</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>.json or .md</div>
                <input type="file" accept=".json,.md" style={{ display: 'none' }} onChange={(e) => {
                  const file = e.target.files?.[0]; if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    try {
                      if (file.name.endsWith('.json')) {
                        const p = JSON.parse(reader.result as string)
                        setLbEditPromptTitle(p.name || file.name); setLbEditPromptText(p.text || p.fullText || p.description || '')
                      } else {
                        setLbEditPromptTitle(file.name.replace(/\.[^.]+$/, '')); setLbEditPromptText(reader.result as string)
                      }
                    } catch { setLbEditPromptTitle(file.name); setLbEditPromptText(reader.result as string || '') }
                  }
                  reader.readAsText(file)
                  e.target.value = ''
                }} />
              </label>}
            </div>
            {/* Create / Edit Prompt — hidden in compact mode */}
            {!compact && lbEditPromptId && <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.8rem', fontWeight: 600 }}>
                {lbEditPromptId === '__new__' ? 'Create New Prompt' : 'Edit Prompt'}
                <button type="button" onClick={() => { setLbEditPromptId(null); setLbEditPromptTitle(''); setLbEditPromptText('') }} style={{ marginLeft: '0.8rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.7rem' }}>Cancel</button>
              </p>
              <input value={lbEditPromptTitle} onChange={(e) => setLbEditPromptTitle(e.target.value)} placeholder="Prompt title (required)" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', color: 'white', padding: '0.6rem 1rem', fontSize: '0.85rem', marginBottom: '0.5rem', outline: 'none', fontFamily: 'inherit' }} />
              <textarea value={lbEditPromptText} onChange={(e) => setLbEditPromptText(e.target.value)} placeholder="Write your prompt template here..." style={{ width: '100%', minHeight: '120px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', color: 'white', padding: '0.8rem 1rem', fontSize: '0.82rem', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, outline: 'none' }} />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* AI Improve */}
                <button type="button" disabled={lbPromptAiImproving || !lbEditPromptText.trim()} onClick={async () => {
                  if (!lbEditPromptText.trim()) return
                  setLbPromptAiImproving(true)
                  try {
                    const { sendToGemini } = await import('./gemini-agent')
                    const result = await sendToGemini(`Improve this prompt for cinematic AI image generation. Make it more detailed, vivid and precise. Return ONLY the improved text:\n\n${lbEditPromptText}`)
                    if (result.text) setLbEditPromptText(result.text)
                  } catch { } finally { setLbPromptAiImproving(false) }
                }} style={{ padding: '0.45rem 0.8rem', borderRadius: '0.5rem', border: '1px solid rgba(156,64,255,0.25)', background: 'rgba(156,64,255,0.06)', color: lbPromptAiImproving ? 'rgba(200,160,255,0.5)' : 'rgba(200,160,255,0.75)', cursor: lbPromptAiImproving ? 'wait' : 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" /></svg>
                  {lbPromptAiImproving ? 'Improving...' : 'Improve with AI'}
                </button>
                <div style={{ flex: 1 }} />
                {/* Use / Inject prompt */}
                <button type="button" disabled={!lbEditPromptText.trim()} onClick={() => {
                  onInjectPrompt?.(lbEditPromptText)
                  setLbEditPromptTitle(''); setLbEditPromptText(''); setLbEditPromptId(null)
                }} style={{ padding: '0.45rem 0.8rem', borderRadius: '0.5rem', border: `1px solid ${!lbEditPromptText.trim() ? 'rgba(64,255,156,0.15)' : 'rgba(64,255,156,0.3)'}`, background: 'rgba(64,255,156,0.06)', color: !lbEditPromptText.trim() ? 'rgba(100,255,180,0.3)' : 'rgba(100,255,180,0.8)', cursor: !lbEditPromptText.trim() ? 'not-allowed' : 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                  Use Prompt
                </button>
                {/* Save as skill file */}
                <button type="button" disabled={!lbEditPromptTitle.trim() || !lbEditPromptText.trim()} onClick={async () => {
                  const slug = lbEditPromptTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40)
                  const newPrompt = { id: `prompt-${slug || 'custom'}-${Date.now()}`, name: lbEditPromptTitle.trim(), description: lbEditPromptText.substring(0, 200), fullText: lbEditPromptText, text: lbEditPromptText, iconIdx: Math.floor(Math.random() * 9), createdAt: new Date().toISOString() }
                  await fetch('/api/skills/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPrompt) })
                  setLbAvailableSkills(prev => [...prev, newPrompt])
                  setLbEditPromptTitle(''); setLbEditPromptText(''); setLbEditPromptId(null)
                }} style={{ padding: '0.45rem 0.8rem', borderRadius: '0.5rem', border: `1px solid ${(!lbEditPromptTitle.trim() || !lbEditPromptText.trim()) ? 'rgba(64,156,255,0.15)' : 'rgba(64,156,255,0.3)'}`, background: 'rgba(64,156,255,0.06)', color: (!lbEditPromptTitle.trim() || !lbEditPromptText.trim()) ? 'rgba(120,180,255,0.3)' : 'rgba(120,180,255,0.8)', cursor: (!lbEditPromptTitle.trim() || !lbEditPromptText.trim()) ? 'not-allowed' : 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /></svg>
                  Save as Skill
                </button>
              </div>
            </div>}
          </div>
        ) : (
          /* ── Skills Tab ── */
          <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600, margin: 0 }}>Available Skills</p>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <button type="button" onClick={() => setLbSkillsPage(Math.max(0, page - 1))} disabled={page === 0} style={{ background: 'none', border: 'none', cursor: page === 0 ? 'default' : 'pointer', padding: '2px', opacity: page === 0 ? 0.15 : 0.5 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} type="button" onClick={() => setLbSkillsPage(i)} style={{ width: '9px', height: '9px', borderRadius: '50%', border: 'none', background: i === page ? 'var(--gold)' : 'rgba(255,255,255,0.18)', boxShadow: i === page ? '0 0 8px rgba(212,175,55,0.6)' : 'none', cursor: 'pointer', padding: 0 }} />
                ))}
                <button type="button" onClick={() => setLbSkillsPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} style={{ background: 'none', border: 'none', cursor: page >= totalPages - 1 ? 'default' : 'pointer', padding: '2px', opacity: page >= totalPages - 1 ? 0.15 : 0.5 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', gap: compact ? '0.6rem' : '1rem', marginBottom: compact ? '1rem' : '2rem' }}>
            {pageSkills.map((skill, sliceIdx) => {
              const idx = page === 0 ? sliceIdx : p1Count + (page - 1) * 6 + sliceIdx
              const isSelected = lbAttachedSkills.some(s => s.id === skill.id)
              const ic = getIcon(skill.iconIdx ?? idx)
              return (
                <button key={skill.id} type="button" onClick={() => {
                  if (isSelected) { setLbAttachedSkills(prev => prev.filter(s => s.id !== skill.id)) }
                  else { setLbAttachedSkills(prev => [...prev, { id: skill.id, name: skill.name }]) }
                }} style={{ width: '100%', aspectRatio: '16/9', background: isSelected ? `rgba(${parseInt(ic.color.slice(1,3),16)},${parseInt(ic.color.slice(3,5),16)},${parseInt(ic.color.slice(5,7),16)},0.08)` : 'rgba(255,255,255,0.015)', backdropFilter: 'blur(16px)', border: `1px solid ${isSelected ? ic.color + '66' : 'rgba(255,255,255,0.06)'}`, borderRadius: compact ? '0.75rem' : '1rem', padding: compact ? '0.6rem 0.5rem' : '1.4rem 1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: compact ? '0.3rem' : '0.7rem', transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)', textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: isSelected ? `0 0 24px ${ic.color}33` : '0 2px 12px rgba(0,0,0,0.3)', transform: isSelected ? 'scale(1.04)' : 'scale(1)' }}>
                  {!compact && <div style={{ position: 'absolute', bottom: '-30px', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '60px', borderRadius: '50%', background: `radial-gradient(ellipse, ${ic.color}18, transparent 70%)`, pointerEvents: 'none', filter: 'blur(8px)' }} />}
                  <div style={{ width: compact ? (isSelected ? '24px' : '22px') : (isSelected ? '44px' : '36px'), height: compact ? (isSelected ? '24px' : '22px') : (isSelected ? '44px' : '36px'), transition: 'all 0.3s ease', filter: isSelected ? `drop-shadow(0 0 10px ${ic.color})` : 'none' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={ic.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}><path d={ic.d} /></svg>
                  </div>
                  <div style={{ fontSize: compact ? '0.7rem' : '0.78rem', fontWeight: 600, color: isSelected ? 'white' : 'rgba(255,255,255,0.75)', lineHeight: 1.3, minHeight: compact ? 'calc(0.7rem * 1.3 * 2)' : 'calc(0.78rem * 1.3 * 2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{skill.name}</div>
                  {!compact && <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{skill.description?.substring(0, 80) || ''}</div>}
                  {isSelected && <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ic.color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg></div>}
                </button>
              )
            })}
            {page === 0 && (
              <label style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.4rem 1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7rem', textAlign: 'center', minHeight: '140px', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>Upload Skills</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>.json or .md</div>
                <input type="file" accept=".json,.md" multiple style={{ display: 'none' }} onChange={(e) => {
                  const files = e.target.files; if (!files) return;
                  Array.from(files).forEach(file => {
                    const reader = new FileReader()
                    reader.onload = () => { try { if (file.name.endsWith('.json')) { const skill = JSON.parse(reader.result as string); fetch('/api/skills/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(skill) }).then(() => setLbAvailableSkills(prev => [...prev, skill])) } } catch {} }
                    reader.readAsText(file)
                  })
                }} />
              </label>
            )}
          </div>
          {lbAttachedSkills.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0.8rem 0' }}>
              <button type="button" onClick={() => setLbSkillOpen(false)} style={{ padding: '0.6rem 2rem', borderRadius: '0.5rem', border: '1.5px solid rgba(96,165,250,0.5)', background: 'transparent', color: 'rgba(96,165,250,0.95)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Attach Selected ({lbAttachedSkills.length})</button>
            </div>
          )}
          </>
        )}
        </div>
      </div>
    </div>
  )
}

function CustomAudioPlayer({ url, fileName, autoPlay, onExpand }: { url: string; fileName: string; autoPlay?: boolean; onExpand?: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(autoPlay || false)
  const isSfx = fileName.toLowerCase().includes('sfx')

  const togglePlay = () => {
    if (audioRef.current) {
      if (playing) audioRef.current.pause()
      else audioRef.current.play()
    }
  }

  return (
    <div className={`custom-audio-player glass ${isSfx ? 'is-sfx' : 'is-music'} ${playing ? 'is-playing' : ''}`}>
      <div className="audio-wave-bg">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="wave-bar" style={{ animationDelay: `${(i * 0.13) % 1.2}s` }}></div>
        ))}
      </div>
      <div className="audio-content">
        <strong className="audio-title" title={fileName}>{fileName}</strong>
        <div className="audio-controls">
          <button className="audio-play-btn" onClick={togglePlay} type="button">
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            )}
          </button>
          {onExpand && (
            <button className="audio-expand-btn" onClick={onExpand} type="button" title="Expand Player">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            </button>
          )}
        </div>
      </div>
      <audio ref={audioRef} src={url} autoPlay={autoPlay} onEnded={() => setPlaying(false)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} style={{ display: 'none' }} />
    </div>
  )
}

function SectionTitle({ eyebrow, title, copy, onEdit }: { eyebrow: string; title: string; copy?: string; onEdit?: (part: 'Eyebrow' | 'Title' | 'Copy', value: string) => void }) {
  return (
    <div className="section-title">
      <p className="eyebrow editable-copy" contentEditable={!!onEdit} suppressContentEditableWarning onBlur={(event) => onEdit?.('Eyebrow', event.currentTarget.textContent || eyebrow)}>{eyebrow}</p>
      <h2 className="editable-copy" contentEditable={!!onEdit} suppressContentEditableWarning onBlur={(event) => onEdit?.('Title', event.currentTarget.textContent || title)}>{title}</h2>
      {copy !== undefined && (
        <p className="editable-copy" contentEditable={!!onEdit} suppressContentEditableWarning onBlur={(event) => onEdit?.('Copy', event.currentTarget.textContent || '')}>{copy}</p>
      )}
    </div>
  )
}

function ShowcaseMediaPicker({ storyboard, onClose, onPick, onUpload }: { storyboard: StoryboardData | null; onClose: () => void; onPick: (media: StoryboardMedia) => void; onUpload: (files: File[]) => void }) {
  const [tab, setTab] = useState<'images' | 'actors' | 'locations' | 'props'>('images')
  const [openAct, setOpenAct] = useState<string | null>(null)
  const data = storyboard || createDefaultStoryboard()
  const resourceTabs: Array<'actors' | 'locations' | 'props'> = ['actors', 'locations', 'props']
  const actMedia = data.acts.map((act) => ({
    act,
    media: act.scenes.flatMap((scene) => [
      ...scene.imageShots.flatMap((shot) => shot.media.filter((media) => media.type === 'image' || media.type === 'video')),
      ...scene.videoShots.flatMap((shot) => shot.media.filter((media) => media.type === 'image' || media.type === 'video')),
    ]),
  }))

  return (
    <div className="showcase-picker-backdrop" role="presentation" onClick={onClose}>
      <div className="showcase-picker glass" onClick={(event) => event.stopPropagation()}>
        <button className="showcase-picker-close" type="button" onClick={onClose}>×</button>
        <div className="showcase-picker-head">
          <strong>Add media</strong>
          <label>
            Upload
            <input type="file" accept="image/*,video/*" multiple onChange={(event) => {
              onUpload(Array.from(event.target.files || []))
              event.target.value = ''
            }} />
          </label>
        </div>
        <div className="showcase-picker-tabs">
          <button className={tab === 'images' ? 'is-active' : ''} type="button" onClick={() => setTab('images')}>Scenes</button>
          {resourceTabs.map((resourceTab) => (
            <button className={tab === resourceTab ? 'is-active' : ''} key={resourceTab} type="button" onClick={() => setTab(resourceTab)}>{resourceTab}</button>
          ))}
        </div>
        <div className="showcase-picker-body">
          {tab === 'images' ? (
            actMedia.map(({ act, media }) => (
              <details key={act.id} open={openAct === act.id || media.length > 0 && openAct === null} onToggle={(event) => {
                if (event.currentTarget.open) setOpenAct(act.id)
              }}>
                <summary>{act.title}<span>{media.length}</span></summary>
                <div className="showcase-picker-grid">
                  {media.map((item) => (
                    <button key={item.id} type="button" onClick={() => onPick(item)}>
                      {item.type === 'video' ? <video src={item.url} muted playsInline /> : <img src={item.url} alt={item.fileName} />}
                    </button>
                  ))}
                </div>
              </details>
            ))
          ) : (
            (data.resources[tab] || []).map((resource) => {
              const media = [...(resource.media || []), ...(resource.sheetMedia || [])].filter((item) => item.type === 'image' || item.type === 'video')
              return (
                <section className="showcase-picker-resource" key={resource.id}>
                  <strong>{resource.name}</strong>
                  <div className="showcase-picker-grid small">
                    {media.map((item) => (
                      <button key={item.id} type="button" onClick={() => onPick(item)}>
                        {item.type === 'video' ? <video src={item.url} muted playsInline /> : <img src={item.url} alt={item.fileName} />}
                      </button>
                    ))}
                  </div>
                </section>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

type MoodboardItem = { id: string; url: string; x: number; y: number; width: number; height: number; name: string; group?: string };
type MoodboardGroup = { id: string; name: string; color: string; itemIds: string[] }

function MoodboardCanvas() {
  const [boardName, setBoardName] = useState(() => window.localStorage.getItem('aisha-moodboard-name') || 'Moodboard');
  const [items, setItems] = useState<MoodboardItem[]>(() => {
    try { return JSON.parse(window.localStorage.getItem('aisha-moodboard-items') || '[]') } catch { return [] }
  });
  const [groups, setGroups] = useState<MoodboardGroup[]>(() => {
    try { return JSON.parse(window.localStorage.getItem('aisha-moodboard-groups') || '[]') } catch { return [] }
  });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { window.localStorage.setItem('aisha-moodboard-name', boardName) }, [boardName])
  useEffect(() => { window.localStorage.setItem('aisha-moodboard-items', JSON.stringify(items)) }, [items])
  useEffect(() => { window.localStorage.setItem('aisha-moodboard-groups', JSON.stringify(groups)) }, [groups])

  const selectedSet = new Set(selectedItems)

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.94 : 1.06;
    setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.target === canvasRef.current)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      if (!e.shiftKey) setSelectedItems([]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
    if (draggingItem) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const worldX = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
      const worldY = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;
      setItems(prev => prev.map(item => item.id === draggingItem ? { ...item, x: worldX, y: worldY } : item));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingItem(null);
  };

  const handleItemMouseDown = (e: React.MouseEvent, item: MoodboardItem) => {
    e.stopPropagation();
    setSelectedItems(prev => (e.shiftKey || e.metaKey)
      ? (prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])
      : [item.id]
    );
    setDraggingItem(item.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldX = (e.clientX - rect.left - pan.x) / zoom;
    const worldY = (e.clientY - rect.top - pan.y) / zoom;
    setDragOffset({ x: worldX - item.x, y: worldY - item.y });
  };

  const addImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/storyboard/upload', { method: 'POST', body: formData });
    const payload = await response.json();
    if (!response.ok) return;
    const url = payload.url;
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const displayWidth = 250;
      const displayHeight = displayWidth / aspectRatio;
      setItems(prev => [...prev, { id: crypto.randomUUID(), url, x: (400 - pan.x) / zoom + Math.random() * 200, y: (300 - pan.y) / zoom + Math.random() * 200, width: displayWidth, height: displayHeight, name: file.name }]);
    };
    img.src = url;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    files.forEach((file) => { void addImage(file) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItems.length) {
      const ids = new Set(selectedItems)
      setItems(prev => prev.filter(item => !ids.has(item.id)));
      setGroups(prev => prev.map(group => ({ ...group, itemIds: group.itemIds.filter(id => !ids.has(id)) })).filter(group => group.itemIds.length > 0))
      setSelectedItems([]);
    }
  };

  const makeGroup = () => {
    if (selectedItems.length < 2) return
    const palette = ['#f8d978', '#63eeb1', '#5fbfff', '#ff6fc4', '#b89cff']
    setGroups(prev => [...prev, { id: crypto.randomUUID(), name: `Group ${prev.length + 1}`, color: palette[prev.length % palette.length], itemIds: selectedItems }])
  }

  const groupBounds = (group: MoodboardGroup) => {
    const members = items.filter(item => group.itemIds.includes(item.id))
    if (!members.length) return null
    const minX = Math.min(...members.map(item => item.x))
    const minY = Math.min(...members.map(item => item.y))
    const maxX = Math.max(...members.map(item => item.x + item.width))
    const maxY = Math.max(...members.map(item => item.y + item.height))
    return { x: minX - 22, y: minY - 44, width: maxX - minX + 44, height: maxY - minY + 66 }
  }

  return (
    <div className="storyboard-stage moodboard-canvas-wrapper" style={{ position: 'relative', overflow: 'hidden', flex: 1, minHeight: '600px' }} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onDrop={handleDrop} onDragOver={e => e.preventDefault()} onKeyDown={handleKeyDown} onContextMenu={e => e.preventDefault()} tabIndex={0} ref={canvasRef}>
      <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', right: '1.5rem', zIndex: 20, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input value={boardName} onChange={(event) => setBoardName(event.target.value)} style={{ width: '14rem', border: '1px solid rgba(248,217,120,0.22)', borderRadius: '999px', background: 'rgba(4,9,18,0.58)', color: 'var(--gold)', padding: '0.58rem 0.9rem', fontWeight: 900, outline: 'none', backdropFilter: 'blur(10px)' }} />
        <button onClick={() => fileInputRef.current?.click()} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid rgba(248, 217, 120, 0.3)', background: 'rgba(248, 217, 120, 0.08)', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.8rem', backdropFilter: 'blur(10px)' }}>+ Add Image</button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { if (e.target.files) Array.from(e.target.files).forEach((file) => { void addImage(file) }); }} />
        <button disabled={selectedItems.length < 2} onClick={makeGroup} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid rgba(95,189,255,0.28)', background: selectedItems.length > 1 ? 'rgba(95,189,255,0.1)' : 'rgba(255,255,255,0.035)', color: selectedItems.length > 1 ? 'rgba(159,221,255,0.95)' : 'rgba(255,255,255,0.28)', cursor: selectedItems.length > 1 ? 'pointer' : 'default', fontSize: '0.8rem', backdropFilter: 'blur(10px)' }}>Group selected</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.35rem', borderRadius: '999px', background: 'rgba(4,9,18,0.5)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
          <button onClick={() => setZoom(prev => Math.max(0.1, prev - 0.08))} style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'var(--cream)', cursor: 'pointer' }}>−</button>
          <input type="range" min="0.1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} style={{ width: '8rem', accentColor: 'var(--gold)' }} />
          <button onClick={() => setZoom(prev => Math.min(3, prev + 0.08))} style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'var(--cream)', cursor: 'pointer' }}>+</button>
          <span style={{ minWidth: '3.2rem', color: 'rgba(255,255,255,0.58)', fontSize: '0.75rem', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: `${20 * zoom}px ${20 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }} />
      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', position: 'absolute', top: 0, left: 0 }}>
        {groups.map(group => {
          const bounds = groupBounds(group)
          if (!bounds) return null
          return (
            <div key={group.id} style={{ position: 'absolute', left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height, border: `1.5px solid ${group.color}`, borderRadius: '1rem', background: `${group.color}12`, pointerEvents: 'none', boxShadow: `0 0 22px ${group.color}22` }}>
              <input value={group.name} onChange={(event) => setGroups(prev => prev.map(item => item.id === group.id ? { ...item, name: event.target.value } : item))} onMouseDown={(event) => event.stopPropagation()} style={{ position: 'absolute', top: '-2.1rem', left: '0.7rem', width: '11rem', pointerEvents: 'auto', border: `1px solid ${group.color}88`, borderRadius: '999px', background: 'rgba(4,9,18,0.82)', color: 'var(--cream)', padding: '0.38rem 0.7rem', fontSize: '0.72rem', fontWeight: 900, outline: 'none' }} />
            </div>
          )
        })}
        {items.map(item => (
          <div key={item.id} onMouseDown={(e) => handleItemMouseDown(e, item)} style={{ position: 'absolute', left: item.x, top: item.y, width: item.width, cursor: draggingItem === item.id ? 'grabbing' : 'grab', border: selectedSet.has(item.id) ? '2px solid var(--gold)' : '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', boxShadow: selectedSet.has(item.id) ? '0 0 20px rgba(248, 217, 120, 0.3)' : '0 4px 15px rgba(0,0,0,0.5)', transition: draggingItem === item.id ? 'none' : 'box-shadow 0.2s, border-color 0.2s', background: 'rgba(10, 15, 25, 0.8)' }}>
            <img src={item.url} alt={item.name} style={{ width: '100%', display: 'block', pointerEvents: 'none' }} draggable={false} />
            <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
          </div>
        ))}
      </div>
      {items.length === 0 && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: '1rem' }}><rect x="10" y="10" width="20" height="14" rx="2" /><rect x="34" y="10" width="20" height="20" rx="2" /><rect x="10" y="28" width="20" height="26" rx="2" /><rect x="34" y="34" width="20" height="20" rx="2" /></svg>
          <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem' }}>Drop images here or click "+ Add Image"</p>
          <p style={{ fontSize: '0.8rem' }}>Scroll or use the zoom bar • Shift-click images to multi-select • Group selected images</p>
        </div>
      )}
    </div>
  );
}

function StoryboardWorkspace() {
  const [storyboard, setStoryboard] = useState<StoryboardData>(createDefaultStoryboard)
  const [activeActId, setActiveActId] = useState('act-1')
  const [activeSceneByAct, setActiveSceneByAct] = useState<Record<string, string>>({})
  const [workspaceMode, setWorkspaceMode] = useState<'storyboard' | StoryboardResourceType | 'agent' | 'moodboard' | 'canvas'>('storyboard')
  const [newResourceName, setNewResourceName] = useState('')
  const [agentDraft, setAgentDraft] = useState({ title: '', sceneHint: '', skillHint: '', prompt: '' })
  const [lightbox, setLightbox] = useState<{ media: StoryboardMedia; allMedia: StoryboardMedia[]; shotId: string; actId: string; sceneId: string; mode: StoryboardSequenceMode; resourceContext?: { type: StoryboardResourceType; resourceId: string; slot: StoryboardResourceSlot } } | null>(null)
  const [lightboxCompare, setLightboxCompare] = useState(false)
  const [lightboxCrop, setLightboxCrop] = useState(false)

  const [lightboxToolMode, setLightboxToolMode] = useState<'normal' | '3d-camera' | 'extend'>('normal')
  const [camRot, setCamRot] = useState({ x: 0, y: 0 })
  const [camZoom, setCamZoom] = useState(1)
  const [isCamDragging, setIsCamDragging] = useState(false)
  const [camSource, setCamSource] = useState<{type: 'front'|'back', index: number} | null>(null)
  const [camTarget, setCamTarget] = useState<{type: 'front'|'back', index: number} | null>(null)
  const [extScale, setExtScale] = useState(1)
  const [extRot, setExtRot] = useState(0)
  const [extOff, setExtOff] = useState({x: 0, y: 0})
  const [isExtDragging, setIsExtDragging] = useState(false)
  const [extStart, setExtStart] = useState({x: 0, y: 0})
  const [localToolImage, setLocalToolImage] = useState<string | null>(null)

  // Handlers
  useEffect(() => {
    if (lightboxToolMode === '3d-camera' && camSource && camTarget) {
      const rowWords = ['top', 'middle', 'bottom'];
      const colWords = ['left', 'center', 'right'];
      const srcRow = rowWords[Math.floor(camSource.index / 3)];
      const srcCol = colWords[camSource.index % 3];
      const tgtRow = rowWords[Math.floor(camTarget.index / 3)];
      const tgtCol = colWords[camTarget.index % 3];

      let promptText = `Use image 1 and create another projection of the exact same space.\nOnly the camera angle and position changes.\n`;
      let isBackTarget = (camTarget.type === 'back');
      if (isBackTarget) {
        promptText += `Camera turns 180 degrees to reveal the back (opposite) view of the space not visible on this image and that should be consistent with the style, architecture and light of the original space.\n`;
      }
      let targetSpaceName = isBackTarget ? "back (opposite side of the image)" : "space";
      let srcPosStr = srcCol.toUpperCase() + " SIDE";
      if (srcCol === 'center') srcPosStr = 'CENTER';
      let lookTowardsStr = tgtCol.toUpperCase() + " " + (tgtRow === 'top' ? 'UP' : tgtRow === 'bottom' ? 'DOWN' : 'FRONT');

      let revealVertical = '';
      if (srcRow === 'top' && tgtRow === 'bottom') { revealVertical = 'down side (topdown view)'; } 
      else if (srcRow === 'bottom' && tgtRow === 'top') { revealVertical = 'upper side (low angle view tilting up)'; } 
      else if (tgtRow === 'top') { revealVertical = 'top down side'; } 
      else if (tgtRow === 'bottom') { revealVertical = 'low angle'; } 
      else { revealVertical = 'front side'; }

      let revealingStr = `revealing the ${tgtCol} ${revealVertical} of the ${targetSpaceName}`;
      let actionDesc = `Camera is now positioned on the ${srcPosStr} looking towards the ${lookTowardsStr} SIDE of the space, ${revealingStr}.`;

      let zoomDesc = '';
      if (camZoom < 1) zoomDesc = ` The camera has pulled back, showing ${Math.round((1/camZoom)*100)}% more of the environment.`;
      else if (camZoom > 1) zoomDesc = ` The camera has zoomed in closely on the subject at ${Math.round(camZoom*100)}% scale.`;

      promptText += `${actionDesc}${zoomDesc}\n[USER NOTE HERE]\nThe image's objects, positions, architecture, and characters must remain exactly the same as reference image 1.\nOnly the camera perspective changes.`;
      
      setLbNote(promptText);
    }
  }, [camZoom, camSource, camTarget, lightboxToolMode]);

  const handleCamPointClick = (type: 'front'|'back', index: number) => {
    if (!camSource) { setCamSource({type, index}); return; }
    if (!camTarget) { 
      setCamTarget({type, index});
    } else {
      setCamSource({type, index});
      setCamTarget(null);
    }
  }

  const handleExtPromptGenerate = () => {
    let zoomText = extScale < 1 ? " The camera has zoomed out." : "";
    let p = `Use exact same image 1 and complete the empty space with seamless background extension that should preserve same style, light and colors, seamlessly and logically completing the space.${zoomText}\n\n{USER CUSTOM PROMPT}\n\nThe quality should match the same level of detail quality and 4k of the original image.`;
    setLbNote(p);
    setLbNoteOpen(true);
  }

  const [lbNote, setLbNote] = useState('')
  const [lbNoteOpen, setLbNoteOpen] = useState(false)
  const [lbEnhanceOpen, setLbEnhanceOpen] = useState(false)
  const [lbSplitOpen, setLbSplitOpen] = useState(false)
  const [lbAssignOpen, setLbAssignOpen] = useState(false)
  const [lbAssignTab, setLbAssignTab] = useState<'image' | 'actor' | 'scene' | 'props'>('image')
  const [lbAssignNewName, setLbAssignNewName] = useState('')
  const [lbAssignExpandAct, setLbAssignExpandAct] = useState<string | null>(null)
  const [lbAttachOpen, setLbAttachOpen] = useState(false)
  const [lbAttachments, setLbAttachments] = useState<string[]>([])
  const [lbModel, setLbModel] = useState('seedream-4.5')
  const [lbQuality, setLbQuality] = useState('2160p')
  const [lbSplitSize, setLbSplitSize] = useState('2x2')
  const [lbProcessing, setLbProcessing] = useState(false)
  const lbFileRef = useRef<HTMLInputElement>(null)
  const lbVideoRef = useRef<HTMLVideoElement | null>(null)
  const [lbAttachTab, setLbAttachTab] = useState<'all' | 'actors' | 'locations' | 'props'>('all')
  const [lbAttachShowAll, setLbAttachShowAll] = useState(false)
  const [lbSkillOpen, setLbSkillOpen] = useState(false)
  const [lbAvailableSkills, setLbAvailableSkills] = useState<any[]>([])
  const [lbSkillsPage, setLbSkillsPage] = useState(0)
  const [lbAiEnhancing, setLbAiEnhancing] = useState(false)
  const [lbEnhancePrompt, setLbEnhancePrompt] = useState('')  // editable prompt for enhance popup
  const [lbModelConfigOpen, setLbModelConfigOpen] = useState(false)
  const [lbSelectedModels, setLbSelectedModels] = useState<Record<string, boolean>>({ 'gemini-3.1-flash': true, 'gemini-3.0': true, 'gpt-image-2.0': true, 'seedream-4.5': false, 'seedream-5.0-lite': false })
  const [lbVideoModel, setLbVideoModel] = useState('seedance-2.0-standard')
  const [lbVideoQuality, setLbVideoQuality] = useState('720p')
  const [lbVideoDuration, setLbVideoDuration] = useState(15)
  const [lbVideoTrimOpen, setLbVideoTrimOpen] = useState(false)
  const [lbVideoTrimStart, setLbVideoTrimStart] = useState(0)
  const [lbVideoTrimEnd, setLbVideoTrimEnd] = useState(0)
  const [lbVideoDurationMeta, setLbVideoDurationMeta] = useState(0)
  const [lbCompareSync, setLbCompareSync] = useState(true)
  const [lbAspectRatio, setLbAspectRatio] = useState('16:9')
  const [lbBatchSize, setLbBatchSize] = useState(1)
  const [lbEmptyMode, setLbEmptyMode] = useState(false)
  const [lbDragIdx, setLbDragIdx] = useState<number | null>(null)
  const [lbAltPage, setLbAltPage] = useState(0)  // pagination for lightbox alt thumbnails
  const [bgGenerating, setBgGenerating] = useState(0)  // background generation counter
  const [bgShotJobs, setBgShotJobs] = useState<Record<string, number>>({})  // per-shot generation counter
  const [lbAttachedSkills, setLbAttachedSkills] = useState<{id: string, name: string}[]>([])  // skills attached as metadata
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null)
  const [status, setStatus] = useState('Loading storyboard archive...')
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!lightbox || lightbox.media.type !== 'video') {
      setLbVideoTrimOpen(false)
      return
    }
    setLbVideoTrimStart(Number(lightbox.media.trimStart) || 0)
    setLbVideoTrimEnd(Number(lightbox.media.trimEnd) || lbVideoDurationMeta || 0)
  }, [lightbox?.media.id])

  const saveStoryboard = (next: StoryboardData) => {
    window.localStorage.setItem('aisha-storyboard-cache', JSON.stringify(next))
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      fetch('/api/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
        .then((response) => response.json())
        .then((payload) => setStatus(payload.localPath ? `Saved to ${payload.localPath}` : 'Saved locally'))
        .catch(() => setStatus('Saved in browser cache. Start the Vite dev server for folder sync.'))
    }, 420)
  }

  const updateStoryboard = (mutate: (draft: StoryboardData) => void) => {
    setStoryboard((current) => {
      const draft = structuredClone(current)
      mutate(draft)
      saveStoryboard(draft)
      return draft
    })
  }

  useEffect(() => {
    fetch('/api/storyboard')
      .then((response) => response.json())
      .then((payload: Partial<StoryboardData>) => {
        const next = normalizeStoryboard(payload)
        setStoryboard(next)
        setActiveActId(next.acts[0]?.id || 'act-1')
        setStatus(`Storyboard folder: ${storyboardStoragePath}`)
        saveStoryboard(next)
      })
      .catch(() => {
        const cached = window.localStorage.getItem('aisha-storyboard-cache')
        const next = cached ? normalizeStoryboard(JSON.parse(cached) as Partial<StoryboardData>) : createDefaultStoryboard()
        setStoryboard(next)
        setActiveActId(next.acts[0]?.id || 'act-1')
        setStatus('Using browser cache. Folder sync API is not reachable.')
      })
  }, [])

  const activeAct = storyboard.acts.find((act) => act.id === activeActId) || storyboard.acts[0]
  const activeSceneId = activeAct ? activeSceneByAct[activeAct.id] || activeAct.scenes[0]?.id : ''
  const activeScene = activeAct?.scenes.find((scene) => scene.id === activeSceneId) || activeAct?.scenes[0]
  const actorNames = storyboard.resources.actors.map((resource) => resource.name)

  const addResource = (type: StoryboardResourceType) => {
    const base = type === 'actors' ? 'New actor' : type === 'locations' ? 'New location' : type === 'props' ? 'New prop' : 'New moodboard'
    const name = newResourceName.trim() || base
    updateStoryboard((draft) => {
      const existingNames = new Set(draft.resources[type].map((resource) => resource.name.toLowerCase()))
      let finalName = name
      let counter = 2
      while (existingNames.has(finalName.toLowerCase())) {
        finalName = `${name} ${counter}`
        counter += 1
      }
      draft.resources[type].push(createResource(type, finalName))
      draft.actors = draft.resources.actors.map((resource) => resource.name)
      draft.locations = draft.resources.locations.map((resource) => resource.name)
    })
    setNewResourceName('')
  }

  const addScene = (actId: string) => {
    updateStoryboard((draft) => {
      const act = draft.acts.find((item) => item.id === actId)
      if (!act) return
      const scene = createScene(act.scenes.length + 1)
      act.scenes.push(scene)
      setActiveSceneByAct((current) => ({ ...current, [actId]: scene.id }))
    })
  }

  const deleteScene = (actId: string, sceneId: string) => {
    updateStoryboard((draft) => {
      const act = draft.acts.find((item) => item.id === actId)
      if (!act || act.scenes.length <= 1) return
      const index = act.scenes.findIndex((scene) => scene.id === sceneId)
      if (index < 0) return
      act.scenes.splice(index, 1)
      const nextScene = act.scenes[Math.max(0, index - 1)] || act.scenes[0]
      setActiveSceneByAct((current) => ({ ...current, [actId]: nextScene.id }))
    })
  }

  const reorderScene = (actId: string, fromId: string, toId: string) => {
    if (fromId === toId) return
    updateStoryboard((draft) => {
      const act = draft.acts.find((item) => item.id === actId)
      if (!act) return
      const from = act.scenes.findIndex((scene) => scene.id === fromId)
      const to = act.scenes.findIndex((scene) => scene.id === toId)
      if (from < 0 || to < 0) return
      const [moved] = act.scenes.splice(from, 1)
      act.scenes.splice(to, 0, moved)
    })
  }

  const addShot = (actId: string, sceneId: string, mode: StoryboardSequenceMode) => {
    updateStoryboard((draft) => {
      const scene = draft.acts.find((act) => act.id === actId)?.scenes.find((item) => item.id === sceneId)
      if (!scene) return
      const shots = getSceneShots(scene, mode)
      const newShot = createShot(shots.length + 1, getMediaTypeForMode(mode))
      // Insert after selected shot if one is selected, otherwise append
      if (selectedShotId) {
        const idx = shots.findIndex(s => s.id === selectedShotId)
        if (idx >= 0) {
          shots.splice(idx + 1, 0, newShot)
        } else {
          shots.push(newShot)
        }
      } else {
        shots.push(newShot)
      }
    })
  }

  const deleteShot = (actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string) => {
    updateScene(actId, sceneId, (scene) => {
      const shots = getSceneShots(scene, mode)
      if (shots.length <= 1) return
      const index = shots.findIndex((shot) => shot.id === shotId)
      if (index >= 0) shots.splice(index, 1)
    })
  }

  const updateScene = (actId: string, sceneId: string, mutate: (scene: StoryboardScene) => void) => {
    updateStoryboard((draft) => {
      const scene = draft.acts.find((act) => act.id === actId)?.scenes.find((item) => item.id === sceneId)
      if (scene) mutate(scene)
    })
  }

  const updateShot = (actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string, mutate: (shot: StoryboardShot) => void) => {
    updateScene(actId, sceneId, (scene) => {
      const shot = getSceneShots(scene, mode).find((item) => item.id === shotId)
      if (shot) mutate(shot)
    })
  }

  const duplicateShot = (actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string) => {
    updateScene(actId, sceneId, (scene) => {
      const shotsKey = mode === 'videos' ? 'videoShots' : 'imageShots'
      const shots = (scene as any)[shotsKey] as StoryboardShot[]
      const idx = shots.findIndex(s => s.id === shotId)
      if (idx === -1) return
      const original = shots[idx]
      const clone: StoryboardShot = JSON.parse(JSON.stringify(original))
      clone.id = `shot-dup-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
      clone.title = original.title + ' (copy)'
      clone.media = clone.media.map(m => ({ ...m, id: `media-dup-${Date.now()}-${Math.random().toString(36).substr(2, 6)}` }))
      if (clone.media.length > 0) clone.selectedMediaId = clone.media[0].id
      shots.splice(idx + 1, 0, clone)
    })
  }

  const deleteShotMedia = (actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string, mediaId: string) => {
    updateShot(actId, sceneId, mode, shotId, (shot) => {
      shot.media = shot.media.filter((media) => media.id !== mediaId)
      if (shot.selectedMediaId === mediaId) shot.selectedMediaId = shot.media[0]?.id
    })
  }

  const moveShotMedia = (actId: string, sceneId: string, mode: StoryboardSequenceMode, fromShotId: string, toShotId: string, mediaId: string) => {
    updateStoryboard((draft) => {
      const act = draft.acts.find(a => a.id === actId)
      if (!act) return
      const scene = act.scenes.find(s => s.id === sceneId)
      if (!scene) return
      const shots = mode === 'images' ? scene.imageShots : mode === 'videos' ? scene.videoShots : scene.audioShots
      const fromShot = shots.find(s => s.id === fromShotId)
      const toShot = shots.find(s => s.id === toShotId)
      if (!fromShot || !toShot) return

      const mediaIndex = fromShot.media.findIndex(m => m.id === mediaId)
      if (mediaIndex > -1) {
        const [media] = fromShot.media.splice(mediaIndex, 1)
        if (fromShot.selectedMediaId === mediaId) {
          fromShot.selectedMediaId = fromShot.media[0]?.id || ''
        }
        toShot.media.unshift(media)
        toShot.selectedMediaId = media.id
      }
    })
  }

  /** Inject generated result media into shot alt slots, or create a new shot if full (8+) */
  const injectResultMedia = (actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string, newMediaList: StoryboardMedia[]) => {
    setStoryboard(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as StoryboardData
      const act = next.acts.find(a => a.id === actId)
      if (!act) return prev
      const scene = act.scenes.find(s => s.id === sceneId)
      if (!scene) return prev
      const shotsKey = mode === 'videos' ? 'videoShots' : mode === 'audio' ? 'audioShots' : 'imageShots'
      const shots = scene[shotsKey] || []
      const shotIdx = shots.findIndex(s => s.id === shotId)
      if (shotIdx === -1) return prev
      const shot = shots[shotIdx]
      const maxAlts = 16
      const freeSlots = maxAlts - shot.media.length
      if (freeSlots >= newMediaList.length) {
        // Enough room — push into current shot
        shot.media.push(...newMediaList)
        shot.selectedMediaId = newMediaList[newMediaList.length - 1].id
      } else {
        // Push what fits into current shot
        const fits = newMediaList.slice(0, Math.max(freeSlots, 0))
        const overflow = newMediaList.slice(Math.max(freeSlots, 0))
        if (fits.length > 0) shot.media.push(...fits)
        // Create new shot right after current one for overflow
        const newShot: StoryboardShot = {
          id: `shot-auto-${Date.now()}`,
          title: `${shot.title} (generated)`,
          prompt: `Proceeded from shot [${shot.title}] via enhance/edit`,
          media: overflow,
          selectedMediaId: overflow[0]?.id,
          actor: shot.actor,
          dialogue: '',
        }
        shots.splice(shotIdx + 1, 0, newShot)
      }
      return next
    })
  }

  const pollPendingVideoJob = (
    jobId: string,
    context: { actId: string; sceneId: string; mode: StoryboardSequenceMode; shotId: string; model: string; batchIndex: number },
    attempt = 0,
  ) => {
    fetch(`/api/tasks/video-job?id=${encodeURIComponent(jobId)}`)
      .then(r => r.json())
      .then(job => {
        if (job.status === 'done' && job.url) {
          setBgGenerating(prev => Math.max(0, prev - 1))
          setBgShotJobs(prev => ({ ...prev, [context.shotId]: Math.max(0, (prev[context.shotId] || 0) - 1) }))
          const cacheBust = job.url + (job.url.includes('?') ? '&' : '?') + 't=' + Date.now()
          injectResultMedia(context.actId, context.sceneId, context.mode, context.shotId, [{
            id: `media-${context.model}-${Date.now()}-${context.batchIndex}`,
            type: 'video',
            url: cacheBust,
            fileName: `${context.model}-${Date.now()}.mp4`,
            localPath: job.localPath,
            createdAt: new Date().toISOString(),
          }])
          return
        }
        if (job.status === 'error' || attempt > 240) {
          setBgGenerating(prev => Math.max(0, prev - 1))
          setBgShotJobs(prev => ({ ...prev, [context.shotId]: Math.max(0, (prev[context.shotId] || 0) - 1) }))
          return
        }
        window.setTimeout(() => pollPendingVideoJob(jobId, context, attempt + 1), 5000)
      })
      .catch(() => {
        if (attempt > 240) {
          setBgGenerating(prev => Math.max(0, prev - 1))
          setBgShotJobs(prev => ({ ...prev, [context.shotId]: Math.max(0, (prev[context.shotId] || 0) - 1) }))
          return
        }
        window.setTimeout(() => pollPendingVideoJob(jobId, context, attempt + 1), 5000)
      })
  }

  const uploadMediaFile = async (file: File, forcedType?: StoryboardMedia['type']) => {
    const formData = new FormData()
    formData.append('file', file)
    setStatus(`Uploading ${file.name}...`)
    const response = await fetch('/api/storyboard/upload', { method: 'POST', body: formData })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Upload failed')
    return {
      id: makeId('media'),
      type: forcedType || (file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image'),
      url: payload.url,
      fileName: payload.fileName,
      localPath: payload.localPath,
      createdAt: new Date().toISOString(),
    } as StoryboardMedia
  }

  const updateShotMedia = (actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string, mediaId: string, mutate: (media: StoryboardMedia) => void) => {
    updateShot(actId, sceneId, mode, shotId, (shot) => {
      const media = shot.media.find((item) => item.id === mediaId)
      if (media) mutate(media)
    })
  }

  const updateResourceMediaInSlot = (context: { type: StoryboardResourceType; resourceId: string; slot: StoryboardResourceSlot }, mediaId: string, mutate: (media: StoryboardMedia) => void) => {
    updateResource(context.type, context.resourceId, (resource) => {
      const collection = context.slot === 'card' ? resource.media : resource.sheetMedia
      const media = collection.find((item) => item.id === mediaId)
      if (media) mutate(media)
    })
  }

  const appendResourceMediaToSlot = (context: { type: StoryboardResourceType; resourceId: string; slot: StoryboardResourceSlot }, mediaItems: StoryboardMedia[]) => {
    updateResource(context.type, context.resourceId, (resource) => {
      const collection = context.slot === 'card' ? resource.media : resource.sheetMedia
      collection.push(...mediaItems)
      const selectedId = mediaItems[0]?.id
      if (selectedId) {
        if (context.slot === 'card') resource.selectedMediaId = selectedId
        else resource.selectedSheetMediaId = selectedId
      }
    })
  }

  const getTrimmedVideoSrc = (media: StoryboardMedia) => {
    if (media.type !== 'video') return media.url
    const start = Math.max(0, Number(media.trimStart) || 0)
    const end = Number(media.trimEnd) || 0
    if (!start && !end) return media.url
    return `${media.url}#t=${start}${end > start ? `,${end}` : ''}`
  }

  const applyLightboxVideoTrim = () => {
    if (!lightbox || lightbox.media.type !== 'video') return
    const start = Math.max(0, Math.min(lbVideoTrimStart, lbVideoTrimEnd || lbVideoDurationMeta || lbVideoTrimStart))
    const end = Math.max(start, lbVideoTrimEnd || lbVideoDurationMeta || start)
    const nextMedia: StoryboardMedia = { ...lightbox.media, trimStart: start, trimEnd: end }
    if (lightbox.resourceContext) {
      updateResourceMediaInSlot(lightbox.resourceContext, lightbox.media.id, (media) => {
        media.trimStart = start
        media.trimEnd = end
      })
    } else {
      updateShotMedia(lightbox.actId, lightbox.sceneId, lightbox.mode, lightbox.shotId, lightbox.media.id, (media) => {
        media.trimStart = start
        media.trimEnd = end
      })
    }
    setLightbox({
      ...lightbox,
      media: nextMedia,
      allMedia: lightbox.allMedia.map((item) => item.id === nextMedia.id ? nextMedia : item),
    })
    setStatus(`Video trim saved: ${start.toFixed(1)}s to ${end.toFixed(1)}s`)
  }

  const resetLightboxVideoTrim = () => {
    if (!lightbox || lightbox.media.type !== 'video') return
    const nextMedia: StoryboardMedia = { ...lightbox.media, trimStart: undefined, trimEnd: undefined }
    if (lightbox.resourceContext) {
      updateResourceMediaInSlot(lightbox.resourceContext, lightbox.media.id, (media) => {
        delete media.trimStart
        delete media.trimEnd
      })
    } else {
      updateShotMedia(lightbox.actId, lightbox.sceneId, lightbox.mode, lightbox.shotId, lightbox.media.id, (media) => {
        delete media.trimStart
        delete media.trimEnd
      })
    }
    setLbVideoTrimStart(0)
    setLbVideoTrimEnd(lbVideoDurationMeta || 0)
    setLightbox({
      ...lightbox,
      media: nextMedia,
      allMedia: lightbox.allMedia.map((item) => item.id === nextMedia.id ? nextMedia : item),
    })
  }

  const splitLightboxVideoAtCurrentTime = () => {
    if (!lightbox || lightbox.media.type !== 'video' || !lbVideoRef.current) return
    const duration = lbVideoDurationMeta || lbVideoRef.current.duration || 0
    const cut = Math.max(0.2, Math.min(lbVideoRef.current.currentTime || duration / 2, Math.max(0.2, duration - 0.2)))
    const baseName = (lightbox.media.fileName || 'video').replace(/\.[^.]+$/, '')
    const partA: StoryboardMedia = {
      ...lightbox.media,
      id: `media-video-split-a-${Date.now()}`,
      fileName: `${baseName}-part-a-${Math.round(cut)}s.mp4`,
      trimStart: lightbox.media.trimStart || 0,
      trimEnd: cut,
      createdAt: new Date().toISOString(),
    }
    const partB: StoryboardMedia = {
      ...lightbox.media,
      id: `media-video-split-b-${Date.now()}`,
      fileName: `${baseName}-part-b-${Math.round(cut)}s.mp4`,
      trimStart: cut,
      trimEnd: lightbox.media.trimEnd || duration,
      createdAt: new Date().toISOString(),
    }
    if (lightbox.resourceContext) appendResourceMediaToSlot(lightbox.resourceContext, [partA, partB])
    else injectResultMedia(lightbox.actId, lightbox.sceneId, lightbox.mode, lightbox.shotId, [partA, partB])
    setLightbox({ ...lightbox, media: partA, allMedia: [...lightbox.allMedia, partA, partB] })
    setStatus(`Split video at ${cut.toFixed(1)}s into two non-destructive alternates.`)
  }

  const extractLightboxVideoFrame = async () => {
    if (!lightbox || lightbox.media.type !== 'video' || !lbVideoRef.current) return
    const video = lbVideoRef.current
    if (!video.videoWidth || !video.videoHeight) {
      setStatus('Video is still loading. Try the frame button again in a moment.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    const second = Math.max(0, Math.round(video.currentTime || 0))
    const safeBase = (lightbox.media.fileName || 'video').replace(/\.[^.]+$/, '')
    const frameMedia = await uploadMediaFile(new File([blob], `${safeBase}-frame-${String(second).padStart(2, '0')}s.png`, { type: 'image/png' }), 'image')
    frameMedia.fileName = `${safeBase}-frame-${String(second).padStart(2, '0')}s.png`
    frameMedia.createdAt = new Date().toISOString()
    frameMedia.frameSecond = second
    frameMedia.sourceVideoUrl = lightbox.media.url
    if (lightbox.resourceContext) appendResourceMediaToSlot(lightbox.resourceContext, [frameMedia])
    else injectResultMedia(lightbox.actId, lightbox.sceneId, lightbox.mode, lightbox.shotId, [frameMedia])
    setLightbox({ ...lightbox, media: frameMedia, allMedia: [...lightbox.allMedia, frameMedia] })
    setStatus(`Extracted frame at ${second}s from ${lightbox.media.fileName || 'video'}`)
  }

  const uploadMedia = async (file: File, actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string) => {
    try {
      const media = await uploadMediaFile(file, getMediaTypeForMode(mode))
      updateShot(actId, sceneId, mode, shotId, (shot) => {
        shot.media.push(media)
        shot.selectedMediaId = media.id
      })
      setStatus(`Stored full quality file: ${media.localPath}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload failed')
    }
  }

  const uploadResourceMedia = async (file: File, type: StoryboardResourceType, resourceId: string, slot: StoryboardResourceSlot) => {
    try {
      const media = await uploadMediaFile(file)
      updateResource(type, resourceId, (resource) => {
        const collection = slot === 'card' ? resource.media : resource.sheetMedia
        collection.push(media)
        if (slot === 'card') resource.selectedMediaId = media.id
        else resource.selectedSheetMediaId = media.id
      })
      setStatus(`Stored full quality file: ${media.localPath}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload failed')
    }
  }

  const deleteResourceMedia = (type: StoryboardResourceType, resourceId: string, slot: StoryboardResourceSlot, mediaId: string) => {
    updateResource(type, resourceId, (resource) => {
      const collection = slot === 'card' ? resource.media : resource.sheetMedia
      const next = collection.filter((media) => media.id !== mediaId)
      if (slot === 'card') {
        resource.media = next
        if (resource.selectedMediaId === mediaId) resource.selectedMediaId = next[0]?.id
      } else {
        resource.sheetMedia = next
        if (resource.selectedSheetMediaId === mediaId) resource.selectedSheetMediaId = next[0]?.id
      }
    })
  }

  const deleteLightboxMedia = () => {
    if (!lightbox) return
    if (lightbox.resourceContext) {
      const { type, resourceId, slot } = lightbox.resourceContext
      deleteResourceMedia(type, resourceId, slot, lightbox.media.id)
    } else if (lightbox.shotId && lightbox.actId) {
      deleteShotMedia(lightbox.actId, lightbox.sceneId, lightbox.mode, lightbox.shotId, lightbox.media.id)
    }
    const remaining = lightbox.allMedia.filter((media) => media.id !== lightbox.media.id)
    if (remaining.length > 0) setLightbox({ ...lightbox, media: remaining[0], allMedia: remaining })
    else setLightbox(null)
  }

  const reorderShot = (actId: string, sceneId: string, mode: StoryboardSequenceMode, fromId: string, toId: string) => {
    if (fromId === toId) return
    updateScene(actId, sceneId, (scene) => {
      const shots = getSceneShots(scene, mode)
      const from = shots.findIndex((shot) => shot.id === fromId)
      const to = shots.findIndex((shot) => shot.id === toId)
      if (from < 0 || to < 0) return
      const [moved] = shots.splice(from, 1)
      shots.splice(to, 0, moved)
    })
  }

  const updateResource = (type: StoryboardResourceType, resourceId: string, mutate: (resource: StoryboardResource) => void) => {
    updateStoryboard((draft) => {
      const resource = draft.resources[type].find((item) => item.id === resourceId)
      if (!resource) return
      mutate(resource)
      draft.actors = draft.resources.actors.map((item) => item.name)
      draft.locations = draft.resources.locations.map((item) => item.name)
    })
  }

  const toggleSceneResource = (type: StoryboardResourceType, resourceId: string) => {
    if (!activeAct || !activeScene) return
    updateScene(activeAct.id, activeScene.id, (scene) => {
      const refs = scene.resourceRefs[type] || []
      if (refs.includes(resourceId)) scene.resourceRefs[type] = refs.filter((id) => id !== resourceId)
      else {
        scene.resourceRefs[type] = [...refs, resourceId]
      }
    })
  }

  const deleteResource = (type: StoryboardResourceType, resourceId: string) => {
    updateStoryboard((draft) => {
      if (draft.resources[type]) {
        draft.resources[type] = draft.resources[type].filter((r) => r.id !== resourceId)
      }
      draft.actors = draft.resources.actors.map((item) => item.name)
      draft.locations = draft.resources.locations.map((item) => item.name)
      // Also remove from any scene's resourceRefs
      draft.acts.forEach(act => {
        act.scenes.forEach(scene => {
          if (scene.resourceRefs[type]) {
            scene.resourceRefs[type] = scene.resourceRefs[type].filter(id => id !== resourceId)
          }
        })
      })
    })
  }

  const reorderResource = (type: StoryboardResourceType, fromId: string, toId: string) => {
    updateStoryboard((draft) => {
      const list = draft.resources[type]
      if (!list) return
      const fromIdx = list.findIndex((r) => r.id === fromId)
      const toIdx = list.findIndex((r) => r.id === toId)
      if (fromIdx > -1 && toIdx > -1 && fromIdx !== toIdx) {
        const [item] = list.splice(fromIdx, 1)
        list.splice(toIdx, 0, item)
      }
    })
  }

  const addAgentTask = () => {
    const prompt = agentDraft.prompt.trim()
    if (!prompt) return
    const now = new Date().toISOString()
    const taskId = makeId('task')
    const newTask = {
      id: taskId,
      title: agentDraft.title.trim() || `Task ${storyboard.agentTasks.length + 1}`,
      prompt,
      sceneHint: agentDraft.sceneHint.trim(),
      skillHint: agentDraft.skillHint.trim(),
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    }
    updateStoryboard((draft) => {
      draft.agentTasks.unshift(newTask)
    })
    // Save to disk as a real task file
    fetch('/api/tasks/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    }).catch(() => { /* silently continue if server is down */ })
    setAgentDraft({ title: '', sceneHint: '', skillHint: '', prompt: '' })
  }

  const updateAgentTask = (taskId: string, mutate: (task: AgentTask) => void) => {
    updateStoryboard((draft) => {
      const task = draft.agentTasks.find((item) => item.id === taskId)
      if (!task) return
      mutate(task)
      task.updatedAt = new Date().toISOString()
    })
  }

  const revealPath = (media?: StoryboardMedia) => {
    if (!media?.localPath) return
    navigator.clipboard?.writeText(media.localPath)
    fetch('/api/storyboard/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: media.localPath }),
    })
      .then((response) => response.json())
      .then((payload) => setStatus(payload.ok ? `Opened in Finder and copied path: ${media.localPath}` : payload.error || `Copied path: ${media.localPath}`))
      .catch(() => setStatus(`Copied path: ${media.localPath}. Restart Vite server to enable Finder reveal.`))
  }

  return (
    <main className="storyboard-shell">
      <div className="storyboard-bg" aria-hidden="true" />
      <header className="storyboard-topbar">
        <a className="brand" href="#hero" aria-label="Back to Aisha showcase">
          <span>A</span>
          <strong>Aisha</strong>
        </a>
        <div>
          <p>Storyboard Lab</p>
          <small>{status}</small>
        </div>
        <a className="storyboard-exit" href="#book">Back to site</a>
      </header>

      <section className="storyboard-hero">
        {workspaceMode === 'agent' ? (
          <div>
            <p className="eyebrow">
              <button className="back-to-storyboard-btn" onClick={() => setWorkspaceMode('storyboard')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--cream)', borderRadius: '999px', padding: '0.2rem 0.8rem', cursor: 'pointer', marginRight: '1rem', transition: 'all 0.2s', fontSize: '0.8rem' }}>← Back</button>
              Agent Workspace
            </p>
            <h1>Director's Cut</h1>
            <p>Write detailed prompts, orchestrate the AI generation pipeline, review assets dynamically, and select the final cuts for the cinematic storyboard.</p>
          </div>
        ) : workspaceMode === 'canvas' ? (
          <div>
            <p className="eyebrow">
              <button className="back-to-storyboard-btn" onClick={() => setWorkspaceMode('storyboard')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--cream)', borderRadius: '999px', padding: '0.2rem 0.8rem', cursor: 'pointer', marginRight: '1rem', transition: 'all 0.2s', fontSize: '0.8rem' }}>← Back</button>
              Full Canvas Mode
            </p>
            <h1>Infinite cinematic node canvas</h1>
            <p>Build image, video, audio, document, and reference graphs on a separate Unreal-style canvas without touching Director's Cut.</p>
          </div>
        ) : (
          <div>
            <p className="eyebrow">Production board</p>
            <h1>FILM STORYBOARD</h1>
            <p>Upload full-quality images or videos, choose winning alternates, write prompts and dialogue, then share the live board through your ngrok URL while this server is running.</p>
          </div>
        )}
        <div className="library-launchers" aria-label="Reference libraries">
          {(['actors', 'locations', 'props'] as StoryboardResourceType[]).map((type) => (
            <button
              aria-label={`Open ${type} library`}
              className={`library-launcher ${type} ${workspaceMode === type ? 'is-active' : ''}`}
              key={type}
              onClick={() => setWorkspaceMode(workspaceMode === type ? 'storyboard' : type)}
              title={getResourceTypeLabel(type)}
              type="button"
            >
              <LibraryIcon type={type} />
            </button>
          ))}
          <button
            aria-label="Open full canvas mode"
            className={`library-launcher canvas ${workspaceMode === 'canvas' ? 'is-active' : ''}`}
            onClick={() => setWorkspaceMode(workspaceMode === 'canvas' ? 'storyboard' : 'canvas')}
            title="Full Canvas Mode"
            type="button"
          >
            <CinematicCanvasIcon />
          </button>
          <button
            aria-label="Open moodboard canvas"
            className={`library-launcher moodboards ${workspaceMode === 'moodboard' ? 'is-active' : ''}`}
            onClick={() => setWorkspaceMode(workspaceMode === 'moodboard' ? 'storyboard' : 'moodboard')}
            title="Moodboard Canvas"
            type="button"
          >
            <LibraryIcon type={'moodboards'} />
          </button>
          <button
            aria-label="Open agent inbox"
            className={`library-launcher agent ${workspaceMode === 'agent' ? 'is-active' : ''}`}
            onClick={() => setWorkspaceMode(workspaceMode === 'agent' ? 'storyboard' : 'agent')}
            title="Agent inbox"
            type="button"
          >
            <AgentIcon />
          </button>
        </div>
      </section>

      <section className={`storyboard-layout ${workspaceMode !== 'storyboard' ? 'is-library-mode' : ''}`}>
        {workspaceMode === 'storyboard' && (
          <aside className="act-rail">
            <div className="act-rail-icon" aria-hidden="true">
              <svg viewBox="0 0 72 72">
                <path d="M12 28h48v30H12z" />
                <path d="M14 14l42-8 4 16-42 8z" />
                <path d="M22 12l10 14M34 10l10 14M46 8l10 14" />
                <path d="M22 28l8 10M38 28l8 10M54 28l-8 10" />
              </svg>
            </div>
            {storyboard.acts.map((act, index) => (
              <button className={act.id === activeActId ? 'is-active' : ''} key={act.id} onClick={() => setActiveActId(act.id)} type="button">
                <span>{String(index + 1).padStart(2, '0')}</span>
                {act.title}
              </button>
            ))}
          </aside>
        )}

        {workspaceMode === 'canvas' ? (
          <CanvasMode onBack={() => setWorkspaceMode('storyboard')} />
        ) : workspaceMode === 'agent' ? (
          <AgentInbox
            draft={agentDraft}
            onAdd={addAgentTask}
            // onBack prop removed because AgentInbox doesn't use it
            onDraftChange={setAgentDraft}
            onTaskChange={updateAgentTask}
            tasks={storyboard.agentTasks}
            data={storyboard}
            onAssignAsset={(type, name, sceneId, url) => {
              if (['actors', 'locations', 'props', 'actor', 'prop', 'location', 'image'].includes(type)) {
                const mappedType = type === 'actor' ? 'actors' : type === 'prop' ? 'props' : type === 'location' ? 'locations' : 'images';
                setStoryboard(prev => {
                  const draft = JSON.parse(JSON.stringify(prev));
                  if (['actors', 'locations', 'props'].includes(mappedType)) {
                    const newResource = {
                      id: crypto.randomUUID(),
                      type: mappedType,
                      name,
                      description: `Assigned from Director's Cut pipeline.`,
                      media: [{ id: crypto.randomUUID(), type: 'image', url, fileName: name }],
                      sheetMedia: []
                    };
                    draft.resources[mappedType].push(newResource);
                    if (sceneId) {
                      for (const act of draft.acts) {
                        for (const scene of act.scenes) {
                          if (scene.id === sceneId && scene.resourceRefs[mappedType]) {
                            scene.resourceRefs[mappedType].push(newResource.id);
                          }
                        }
                      }
                    }
                  } else if (mappedType === 'images' && sceneId) {
                    for (const act of draft.acts) {
                      for (const scene of act.scenes) {
                        if (scene.id === sceneId) {
                          scene.imageShots.push({
                            id: crypto.randomUUID(),
                            title: name || 'Assigned Shot',
                            prompt: '',
                            dialogue: '',
                            actor: '',
                            tags: [],
                            media: [{ id: crypto.randomUUID(), type: 'image', url, fileName: name }],
                            selectedMediaId: undefined
                          });
                        }
                      }
                    }
                  }
                  return draft;
                })
              }
            }}
          />
        ) : workspaceMode === 'moodboard' ? (
          <MoodboardCanvas />
        ) : workspaceMode !== 'storyboard' ? (
          <ResourceLibrary
            newName={newResourceName}
            onAdd={addResource}
            onBack={() => setWorkspaceMode('storyboard')}
            onCopyPath={revealPath}
            onDeleteMedia={deleteResourceMedia}
            onLightbox={(m, allMedia, resourceContext) => setLightbox({ media: m, allMedia: allMedia?.length ? allMedia : [m], shotId: '', actId: '', sceneId: '', mode: m.type === 'video' ? 'videos' : m.type === 'audio' ? 'audio' : 'images', resourceContext })}
            onNameChange={setNewResourceName}
            onResourceChange={updateResource}
            onUpload={uploadResourceMedia}
            resources={storyboard.resources[workspaceMode]}
            type={workspaceMode}
            onDeleteResource={deleteResource}
            onReorderResource={reorderResource}
          />
        ) : activeAct && activeScene && (
          <div className="storyboard-stage">
            <div className="scene-strip">
              <div className="scene-strip-title">
                <span>{activeAct.title}</span>
              </div>
              <div className="scene-tabs">
                {activeAct.scenes.map((scene, index) => (
                  <div
                    className={`scene-tab ${scene.id === activeScene.id ? 'is-active' : ''}`}
                    draggable
                    key={scene.id}
                    onDragOver={(event) => event.preventDefault()}
                    onDragStart={(event) => event.dataTransfer.setData('text/storyboard-scene', scene.id)}
                    onDrop={(event) => {
                      event.preventDefault()
                      const fromId = event.dataTransfer.getData('text/storyboard-scene')
                      if (fromId) reorderScene(activeAct.id, fromId, scene.id)
                    }}
                  >
                    <button className="scene-tab-main" onClick={() => setActiveSceneByAct((current) => ({ ...current, [activeAct.id]: scene.id }))} type="button">
                      Scene {index + 1}
                    </button>
                    {activeAct.scenes.length > 1 && (
                      <button aria-label={`Delete scene ${index + 1}`} className="scene-tab-delete" onClick={() => deleteScene(activeAct.id, scene.id)} type="button">×</button>
                    )}
                  </div>
                ))}
                <button className="scene-add-tab" aria-label="Add scene" onClick={() => addScene(activeAct.id)} type="button">＋</button>
              </div>
            </div>

            <div className="scene-header">
              <input
                value={activeScene.title}
                onChange={(event) => updateScene(activeAct.id, activeScene.id, (scene) => { scene.title = event.target.value })}
              />
              <div className="mode-toggle">
                <button className={`scene-mode-tab peach ${activeScene.mode === 'images' ? 'is-active' : ''}`} onClick={() => updateScene(activeAct.id, activeScene.id, (scene) => { scene.mode = 'images' })} type="button" title="Images">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </button>
                <button className={`scene-mode-tab peach ${activeScene.mode === 'videos' ? 'is-active' : ''}`} onClick={() => updateScene(activeAct.id, activeScene.id, (scene) => { scene.mode = 'videos' })} type="button" title="Videos">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </button>
                <button className={`scene-mode-tab peach ${activeScene.mode === 'audio' ? 'is-active' : ''}`} onClick={() => updateScene(activeAct.id, activeScene.id, (scene) => { scene.mode = 'audio' })} type="button" title="Music/SFX">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                </button>
                <button className={`scene-mode-tab blue ${activeScene.mode === 'actors' ? 'is-active' : ''}`} onClick={() => updateScene(activeAct.id, activeScene.id, (scene) => { scene.mode = 'actors' })} type="button" title="Actors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </button>
                <button className={`scene-mode-tab green ${activeScene.mode === 'locations' ? 'is-active' : ''}`} onClick={() => updateScene(activeAct.id, activeScene.id, (scene) => { scene.mode = 'locations' })} type="button" title="Locations">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                </button>
                <button className={`scene-mode-tab magenta ${activeScene.mode === 'props' ? 'is-active' : ''}`} onClick={() => updateScene(activeAct.id, activeScene.id, (scene) => { scene.mode = 'props' })} type="button" title="Props">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </button>
              </div>
              <button aria-label="Add shot or asset" className="add-shot-icon" onClick={() => {
                if (activeScene.mode === 'images' || activeScene.mode === 'videos' || activeScene.mode === 'audio') {
                  addShot(activeAct.id, activeScene.id, activeScene.mode)
                } else {
                  // Fallback for resources - maybe open the modal in the future
                }
              }} title="Add" type="button">＋</button>
            </div>

            {activeScene.mode === 'images' || activeScene.mode === 'videos' || activeScene.mode === 'audio' ? (
              <ShotGrid
                actors={actorNames}
                actId={activeAct.id}
                scene={activeScene}
                mode={activeScene.mode}
                onCopyPath={revealPath}
                onDeleteMedia={deleteShotMedia}
                onDeleteShot={deleteShot}
                onDuplicateShot={duplicateShot}
                onLightbox={(media, allMedia, shotId) => setLightbox({ media, allMedia, shotId, actId: activeAct.id, sceneId: activeScene.id, mode: activeScene.mode })}
                onEmptyLightbox={(shotId) => {
                  const emptyMedia: StoryboardMedia = {
                    id: `empty-${Date.now()}`,
                    type: activeScene.mode === 'videos' ? 'video' : activeScene.mode === 'audio' ? 'audio' : 'image',
                    url: '',
                    fileName: '',
                    createdAt: new Date().toISOString(),
                  }
                  setLightbox({ media: emptyMedia, allMedia: [], shotId, actId: activeAct.id, sceneId: activeScene.id, mode: activeScene.mode })
                  setLbEmptyMode(true); setLbNoteOpen(true)
                }}
                onReorder={reorderShot}
                onShotChange={updateShot}
                onUpload={uploadMedia}
                selectedShotId={selectedShotId}
                onSelectShot={setSelectedShotId}
                masterAspect={storyboard.masterAspect}
                setMasterAspect={(aspect) => updateStoryboard(draft => { draft.masterAspect = aspect })}
                onRowToggle={(rowIndex, expanded) => updateStoryboard(draft => {
                  const act = draft.acts.find(a => a.id === activeAct.id)
                  if (!act) return
                  const sc = act.scenes.find(s => s.id === activeScene.id)
                  if (!sc) return
                  const shotsList = activeScene.mode === 'images' ? sc.imageShots : activeScene.mode === 'videos' ? sc.videoShots : sc.audioShots
                  for (let i = rowIndex * 4; i < (rowIndex + 1) * 4 && i < shotsList.length; i++) {
                    shotsList[i].expanded = expanded
                  }
                })}
                onMoveMedia={moveShotMedia}
              />
            ) : activeScene.mode === 'moodboards' ? (
              <div className="scene-resources" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'rgba(255,255,255,0.4)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '1rem', marginTop: '1rem' }}>
                [Infinite Moodboard Canvas Placeholder]
              </div>
            ) : (
              <div className="scene-resources">
                <SceneResourcePanel
                  onCopyPath={revealPath}
                  onLightbox={(m, allMedia, resourceContext) => setLightbox({ media: m, allMedia: allMedia?.length ? allMedia : [m], shotId: '', actId: '', sceneId: '', mode: m.type === 'video' ? 'videos' : m.type === 'audio' ? 'audio' : 'images', resourceContext })}
                  onToggle={toggleSceneResource}
                  refs={activeScene.resourceRefs[activeScene.mode]}
                  resources={storyboard.resources[activeScene.mode]}
                  type={activeScene.mode}
                  onDeleteResource={deleteResource}
                  onReorderResource={reorderResource}
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* Background generation indicator */}
      {bgGenerating > 0 && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9990, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', borderRadius: '999px', background: 'rgba(8,16,30,0.92)', border: '1px solid rgba(248,217,120,0.25)', backdropFilter: 'blur(16px)', boxShadow: '0 12px 40px rgba(0,0,0,0.4), 0 0 20px rgba(248,217,120,0.08)', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ width: '14px', height: '14px', border: '2px solid rgba(248,217,120,0.2)', borderTop: '2px solid var(--gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--gold)', fontSize: '0.78rem', fontWeight: 700 }}>Generating {bgGenerating} image{bgGenerating > 1 ? 's' : ''}...</span>
        </div>
      )}

      {lightbox && (
        <div className="storyboard-lightbox" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={(e) => { if (e.target === e.currentTarget) { if (lightboxCompare) { setLightboxCompare(false) } else if (lbNoteOpen || lbEnhanceOpen || lbSplitOpen || lbAssignOpen || lbAttachOpen) { setLbNoteOpen(false); setLbEnhanceOpen(false); setLbSplitOpen(false); setLbAssignOpen(false); setLbAttachOpen(false); setLbSkillOpen(false); setLbModelConfigOpen(false) } else if (lightboxToolMode !== 'normal') { setLightboxToolMode('normal'); } else { setLightbox(null); setLightboxCompare(false); setLbEmptyMode(false) } } }} onDoubleClick={(e) => { if (e.target === e.currentTarget && lightboxCompare) setLightboxCompare(false) }} role="presentation">
          {/* Close button */}
          <button aria-label="Close" onClick={() => { setLightbox(null); setLightboxCompare(false); setLbNoteOpen(false); setLbEnhanceOpen(false); setLbSplitOpen(false); setLbAssignOpen(false); setLbAttachOpen(false); setLbNote(''); setLbAttachments([]); setLbEmptyMode(false) }} type="button" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'rgba(255,255,255,0.5)', width: '36px', height: '36px', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '1.2rem', zIndex: 10 }}>✕</button>
          {!lightboxCompare ? (
            /* === Normal View — fully functional === */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '90vw', maxHeight: '90vh' }}>
              {(() => {
                // Get current shot for prompt injection — computed inside the view
                const lbAct = storyboard.acts.find(a => a.id === lightbox.actId)
                const lbScene = lbAct?.scenes.find(s => s.id === lightbox.sceneId)
                const lbShots = lbScene ? (lightbox.mode === 'images' ? lbScene.imageShots : lightbox.mode === 'videos' ? lbScene.videoShots : lbScene.audioShots) : []
                const lbShotIdx = lbShots.findIndex(s => s.id === lightbox.shotId)
                const lbCurrentShot = lbShotIdx >= 0 ? lbShots[lbShotIdx] : null
                const lbShotLabel = lbCurrentShot?.title || `Shot ${lbShotIdx + 1}`
                const lbShotPrompt = lbCurrentShot?.prompt || ''
                return (<>
              <div style={{ position: 'relative', borderRadius: '1rem', overflow: 'visible', boxShadow: '0 30px 80px rgba(0,0,0,0.7)', display: 'inline-block', maxWidth: '85vw', transform: lightboxToolMode !== 'normal' ? 'translateY(-8vh)' : 'none', transition: 'all 0.3s ease' }} onClick={() => { if (lbNoteOpen) { setLbNoteOpen(false); setLbSkillOpen(false); setLbModelConfigOpen(false) } }}>
                
                {lightbox.media.type === 'image' && (
                <div style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 30 }}>
                  {lightboxToolMode !== 'extend' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: lightboxToolMode === '3d-camera' ? 'rgba(0,0,0,0.6)' : 'transparent', backdropFilter: lightboxToolMode === '3d-camera' ? 'blur(10px)' : 'none', padding: lightboxToolMode === '3d-camera' ? '0.2rem 0.5rem' : '0', borderRadius: '2rem' }}>
                      <button className={`tool-icon action-star ${lightboxToolMode === '3d-camera' ? 'is-active' : ''}`} onClick={() => { setLightboxToolMode(lightboxToolMode === '3d-camera' ? 'normal' : '3d-camera'); setLocalToolImage(null); setLbNoteOpen(false); }} title="3D Camera Projection" style={{ display: lightboxToolMode !== 'normal' && lightboxToolMode !== '3d-camera' ? 'none' : 'grid', background: lightboxToolMode === '3d-camera' ? 'transparent' : undefined, boxShadow: lightboxToolMode === '3d-camera' ? 'none' : undefined }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                      </button>
                      {lightboxToolMode === '3d-camera' && (
                        <button className="tool-icon" onClick={() => { setLightboxToolMode('normal'); setLbNoteOpen(false); }} title="Return" style={{ background: 'transparent', boxShadow: 'none' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        </button>
                      )}
                    </div>
                  )}
                  {lightboxToolMode !== '3d-camera' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: lightboxToolMode === 'extend' ? 'rgba(0,0,0,0.6)' : 'transparent', backdropFilter: lightboxToolMode === 'extend' ? 'blur(10px)' : 'none', padding: lightboxToolMode === 'extend' ? '0.2rem 0.5rem' : '0', borderRadius: '2rem', border: lightboxToolMode === 'extend' ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                      {lightboxToolMode === 'extend' && <span style={{ color: 'white', fontWeight: 'bold', paddingLeft: '0.5rem' }}>-</span>}
                      {lightboxToolMode === 'extend' && <input type="range" min="0.1" max="4" step="0.05" value={extScale} onChange={(e) => { setExtScale(parseFloat(e.target.value)); handleExtPromptGenerate(); }} style={{ width: '120px', accentColor: 'var(--gold)' }} />}
                      {lightboxToolMode === 'extend' && <span style={{ color: 'white', fontWeight: 'bold', paddingRight: '0.5rem' }}>+</span>}
                      
                      {lightboxToolMode === 'extend' && (
                        <button className="tool-icon action-cut" onClick={() => { setLightboxCrop(true); setLbNoteOpen(false); }} title="Crop" style={{ background: 'transparent', boxShadow: 'none' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"/><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"/></svg>
                        </button>
                      )}
                      {lightboxToolMode === 'extend' && (
                        <button className="tool-icon" onClick={() => { setLightboxToolMode('normal'); setLbNoteOpen(false); }} title="Return" style={{ background: 'transparent', boxShadow: 'none' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        </button>
                      )}
                      
                      <button className={`tool-icon action-doodle ${lightboxToolMode === 'extend' ? 'is-active' : ''}`} onClick={() => { setLightboxToolMode(lightboxToolMode === 'extend' ? 'normal' : 'extend'); setLocalToolImage(null); setLbNoteOpen(lightboxToolMode !== 'extend'); if(lightboxToolMode !== 'extend') handleExtPromptGenerate(); }} title="Image Extend" style={{ border: lightboxToolMode === 'extend' ? 'none' : undefined, background: lightboxToolMode === 'extend' ? 'transparent' : undefined, boxShadow: lightboxToolMode === 'extend' ? 'none' : undefined }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                      </button>
                    </div>
                  )}
                </div>
                )}

                {/* Shot number badge — top right of image */}
                <div style={{ position: 'absolute', top: '0.6rem', right: '4.5rem', zIndex: 8, padding: '0.25rem 0.7rem', borderRadius: '999px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.65)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em', pointerEvents: 'none' }}>{lbShotLabel}</div>
                {lbEmptyMode && !lightbox.media.url ? (
                  /* Empty shot generation canvas */
                  <div style={{ width: '85vw', maxWidth: '1200px', aspectRatio: '16/9', maxHeight: '72vh', borderRadius: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.2rem', background: 'linear-gradient(135deg, rgba(10,20,38,0.85), rgba(15,25,45,0.9))', border: '1px solid rgba(248,217,120,0.08)', backdropFilter: 'blur(32px)' }}>
                    {lightbox.mode === 'videos' ? (
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(248,217,120,0.2)" strokeWidth="1.2"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 9l4-2v10l-4-2z"/></svg>
                    ) : (
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(248,217,120,0.2)" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    )}
                    <div style={{ color: 'rgba(248,217,120,0.35)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.08em' }}>{lightbox.mode === 'videos' ? 'Create a cinematic video.' : lightbox.mode === 'audio' ? 'Create an audio cue.' : 'It all starts with an image.'}</div>
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem', maxWidth: '400px', textAlign: 'center', lineHeight: 1.5 }}>Write your vision in the note below, attach references, choose your models and hit submit to generate.</div>
                  </div>
                ) : lightbox.media.type === 'video' ? <video
                  ref={lbVideoRef}
                  src={getTrimmedVideoSrc(lightbox.media)}
                  controls
                  autoPlay
                  onLoadedMetadata={(event) => {
                    const duration = event.currentTarget.duration || 0
                    setLbVideoDurationMeta(duration)
                    setLbVideoTrimStart(Number(lightbox.media.trimStart) || 0)
                    setLbVideoTrimEnd(Number(lightbox.media.trimEnd) || duration)
                  }}
                  onTimeUpdate={(event) => {
                    const end = Number(lightbox.media.trimEnd) || 0
                    if (end > 0 && event.currentTarget.currentTime >= end) event.currentTarget.pause()
                  }}
                  style={{ maxHeight: '72vh', maxWidth: '85vw', borderRadius: '1rem', display: 'block', background: 'rgba(0,0,0,0.72)' }}
                /> : lightbox.media.type === 'audio' ? <div style={{ padding: '3rem' }}><CustomAudioPlayer url={lightbox.media.url} fileName={lightbox.media.fileName} autoPlay /></div> : lightboxToolMode === '3d-camera' ? (
                  <div className="container-3d" 
                    onMouseDown={(e) => { setIsCamDragging(true); setExtStart({x: e.clientX, y: e.clientY}); }}
                    onMouseMove={(e) => { if(isCamDragging) { setCamRot({ x: camRot.x + (e.clientX - extStart.x)*0.5, y: camRot.y + (e.clientY - extStart.y)*0.5 }); setExtStart({x: e.clientX, y: e.clientY}); } }}
                    onMouseUp={() => setIsCamDragging(false)} onMouseLeave={() => setIsCamDragging(false)}
                    style={{ maxWidth: '85vw', maxHeight: '75vh', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '75vh', overflow: 'hidden', borderRadius: '1rem', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }}>

                    <div style={{ transform: `scale(${camZoom})`, transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="image-plane" style={{ transform: `rotateX(${-camRot.y}deg) rotateY(${camRot.x}deg)` }}>
                        <div className="image-plane-inner" style={{ backgroundImage: `url('${localToolImage || lightbox.media.url}')` }} />
                        <div className="target-grid back-grid">
                          {[0,1,2,3,4,5,6,7,8].map(i => <div key={`b${i}`} className={`point ${camTarget?.type==='back' && camTarget.index===i ? 'active' : ''} ${camSource?.type==='back' && camSource.index===i ? 'active has-camera' : ''}`} onClick={(e) => { e.stopPropagation(); handleCamPointClick('back', i); }}>
                            {(camSource?.type==='back' && camSource.index===i) && <div className="camera-icon">🎥</div>}
                          </div>)}
                        </div>
                        <div className="source-grid front-grid">
                          {[0,1,2,3,4,5,6,7,8].map(i => <div key={`f${i}`} className={`point ${camTarget?.type==='front' && camTarget.index===i ? 'active' : ''} ${camSource?.type==='front' && camSource.index===i ? 'active has-camera' : ''}`} onClick={(e) => { e.stopPropagation(); handleCamPointClick('front', i); }}>
                            {(camSource?.type==='front' && camSource.index===i) && <div className="camera-icon">🎥</div>}
                          </div>)}
                        </div>
                        {/* Laser Line Renderer */}
                        {camSource && camTarget && (() => {
                          const getPos = (type: 'front'|'back', idx: number) => {
                            const row = Math.floor(idx / 3); const col = idx % 3;
                            const z = type === 'front' ? 150 : -150;
                            return { x: (col - 1) * 340, y: (row - 1) * 223.33, z };
                          };
                          const srcPos = getPos(camSource.type, camSource.index);
                          const tgtPos = getPos(camTarget.type, camTarget.index);
                          const dx = tgtPos.x - srcPos.x; const dy = tgtPos.y - srcPos.y; const dz = tgtPos.z - srcPos.z;
                          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                          const rotY = Math.atan2(dz, dx);
                          const rotZ = Math.asin(dy / dist);
                          return (
                            <div className="laser-line" style={{
                              width: `${dist}px`,
                              left: '50%', top: '50%',
                              color: camSource.type === 'back' ? 'rgba(255, 100, 150, 0.9)' : 'rgba(100, 200, 255, 0.9)',
                              transform: `translate3d(${srcPos.x}px, ${srcPos.y}px, ${srcPos.z}px) rotateY(${-rotY}rad) rotateZ(${rotZ}rad)`
                            }} />
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ) : lightboxToolMode === 'extend' ? (
                  <div className="extend-preview" style={{ position: 'relative', top: '6vh', maxWidth: '85vw', maxHeight: '75vh', aspectRatio: '16/9', height: '75vh', backgroundImage: 'radial-gradient(circle, rgba(248,217,120,0.25) 1.5px, transparent 1.5px)', backgroundSize: '16px 16px', backgroundColor: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)' }}
                    onWheel={(e) => { e.preventDefault(); setExtScale(Math.max(0.1, Math.min(extScale + (e.deltaY < 0 ? 0.05 : -0.05), 4))); handleExtPromptGenerate(); }}
                    onMouseMove={(e) => { 
                      if(isExtDragging) {
                        if(e.altKey) setExtRot(extRot + (e.clientX - extStart.x)*0.3);
                        else setExtOff({x: e.clientX - extStart.x, y: e.clientY - extStart.y});
                      }
                    }}
                    onMouseUp={() => setIsExtDragging(false)} onMouseLeave={() => setIsExtDragging(false)}>

                    <div 
                      style={{ position: 'relative', display: 'inline-block', zIndex: 2, transform: `translate3d(${extOff.x}px, ${extOff.y}px, 0) scale(${extScale}) rotate(${extRot}deg)`, boxShadow: '0 0 30px rgba(0,0,0,0.8)', cursor: 'grab' }}
                      onMouseDown={(e) => { e.stopPropagation(); setIsExtDragging(true); setExtStart({x: e.clientX - extOff.x, y: e.clientY - extOff.y}); }}
                    >
                      <img src={lightbox.media.url} draggable="false" style={{ width: '40vw', display: 'block', pointerEvents: 'none' }} />
                      <div 
                        onMouseDown={(e) => { 
                          e.stopPropagation(); e.preventDefault(); 
                          const startX = e.clientX; const startScale = extScale;
                          const onMove = (moveEvt: MouseEvent) => { setExtScale(Math.max(0.1, startScale + (moveEvt.clientX - startX) * 0.005)); handleExtPromptGenerate(); };
                          const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                          document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
                        }}
                        style={{ position: 'absolute', bottom: 0, right: 0, width: '30px', height: '30px', cursor: 'nwse-resize', background: 'linear-gradient(135deg, transparent 50%, rgba(248,217,120,0.9) 50%)', borderBottomRightRadius: '4px', pointerEvents: 'auto' }}
                      />
                    </div>
                  </div>
                ) : <img src={lightbox.media.url} alt={lightbox.media.fileName} style={{ maxHeight: '65vh', maxWidth: '85vw', borderRadius: '1rem', display: 'block', objectFit: 'contain' }} />}
                {lbProcessing && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', borderRadius: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', zIndex: 10 }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(248,217,120,0.2)', borderTop: '3px solid var(--gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: 'var(--gold)', fontSize: '0.9rem', fontWeight: 600 }}>Generating...</span>
                  </div>
                )}
                {lightbox.media.type !== 'audio' && (
                  <div onClick={(e) => e.stopPropagation()}>
                    {lightbox.media.type === 'image' && lightboxToolMode === 'normal' && (
                      <>
                        <div className="floating-tools left vertical" style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', zIndex: 5 }}>
                          <button className="tool-icon action-doodle" onClick={() => { setLightboxCrop(true); setLbNoteOpen(false); setLbEnhanceOpen(false); setLbSplitOpen(false); setLbAssignOpen(false) }} title="Crop"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"/><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"/></svg></button>
                          <button className={`tool-icon action-star ${lbEnhanceOpen ? 'is-active' : ''}`} onClick={() => { setLbEnhanceOpen(!lbEnhanceOpen); setLbSplitOpen(false); setLbAssignOpen(false); setLbNoteOpen(false) }} title="Enhance"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" /></svg></button>
                          <button className={`tool-icon action-cut ${lbSplitOpen ? 'is-active' : ''}`} onClick={() => { setLbSplitOpen(!lbSplitOpen); setLbEnhanceOpen(false); setLbAssignOpen(false); setLbNoteOpen(false) }} title="Split Grid"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" /></svg></button>
                        </div>
                        <div className="floating-tools right vertical" style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', zIndex: 5 }}>
                          <button className={`tool-icon assign-star ${lbAssignOpen ? 'is-active' : ''}`} onClick={() => { setLbAssignOpen(!lbAssignOpen); setLbEnhanceOpen(false); setLbSplitOpen(false); setLbNoteOpen(false) }} title="Add to Scene"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></button>
                          <button className={`tool-icon action-note ${lbNoteOpen ? 'is-active' : ''}`} onClick={() => { setLbNoteOpen(!lbNoteOpen); setLbEnhanceOpen(false); setLbSplitOpen(false); setLbAssignOpen(false) }} title="Note"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                          <button className="tool-icon discard" onClick={deleteLightboxMedia} title="Delete"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg></button>
                        </div>
                        <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 5 }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="tool-icon" onClick={() => { const a = document.createElement('a'); a.href = lightbox.media.url; a.download = lightbox.media.fileName || 'image.png'; document.body.appendChild(a); a.click(); document.body.removeChild(a) }} title="Download"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {(bgShotJobs[lightbox.shotId] || 0) > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.7rem', borderRadius: '999px', background: 'rgba(248,217,120,0.1)', border: '1px solid rgba(248,217,120,0.2)' }}>
                                <div style={{ width: '10px', height: '10px', border: '2px solid rgba(248,217,120,0.2)', borderTop: '2px solid var(--gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                <span style={{ color: 'var(--gold)', fontSize: '0.7rem', fontWeight: 700 }}>{bgShotJobs[lightbox.shotId]} generating</span>
                              </div>
                            )}
                            {lightbox.allMedia.length > 1 && <button className="tool-icon action-star" onClick={() => setLightboxCompare(true)} title="Compare"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>}
                          </div>
                        </div>
                      </>
                    )}
                    {lightbox.media.type === 'video' && lightboxToolMode === 'normal' && (
                      <>
                        <div className="floating-tools left vertical" style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', zIndex: 5 }}>
                          <button className="tool-icon action-cut" onClick={extractLightboxVideoFrame} title="Extract current frame">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 13l2.5-3 2 2.4 1.5-1.4L17 15H7z"/></svg>
                          </button>
                          <button className={`tool-icon action-doodle ${lbVideoTrimOpen ? 'is-active' : ''}`} onClick={() => { setLbVideoTrimOpen(!lbVideoTrimOpen); setLbNoteOpen(false) }} title="Trim video">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"/><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"/></svg>
                          </button>
                          <button className="tool-icon action-doodle" onClick={splitLightboxVideoAtCurrentTime} title="Split at current frame">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88"/><path d="M14.47 14.48 20 20"/><path d="M8.12 8.12 12 12"/></svg>
                          </button>
                        </div>
                        <div className="floating-tools right vertical" style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', zIndex: 5 }}>
                          <button className={`tool-icon assign-star ${lbAssignOpen ? 'is-active' : ''}`} onClick={() => { setLbAssignOpen(!lbAssignOpen); setLbEnhanceOpen(false); setLbSplitOpen(false); setLbNoteOpen(false) }} title="Add to Scene"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></button>
                          <button className={`tool-icon action-note ${lbNoteOpen ? 'is-active' : ''}`} onClick={() => { setLbNoteOpen(!lbNoteOpen); setLbEnhanceOpen(false); setLbSplitOpen(false); setLbAssignOpen(false) }} title="Prompt / note"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                          <button className="tool-icon action-star" onClick={() => { setLbAttachments(prev => prev.includes(lightbox.media.url) ? prev : [...prev, lightbox.media.url]); setLbNoteOpen(true) }} title="Use this video as reference"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
                          <button className="tool-icon discard" onClick={deleteLightboxMedia} title="Delete"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
                        </div>
                        <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 5, pointerEvents: 'none' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', pointerEvents: 'auto' }}>
                            <button className="tool-icon" onClick={() => { const a = document.createElement('a'); a.href = lightbox.media.url; a.download = lightbox.media.fileName || 'video.mp4'; document.body.appendChild(a); a.click(); document.body.removeChild(a) }} title="Download video"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', pointerEvents: 'auto' }}>
                            {(bgShotJobs[lightbox.shotId] || 0) > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.7rem', borderRadius: '999px', background: 'rgba(248,217,120,0.1)', border: '1px solid rgba(248,217,120,0.2)' }}>
                                <div style={{ width: '10px', height: '10px', border: '2px solid rgba(248,217,120,0.2)', borderTop: '2px solid var(--gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                <span style={{ color: 'var(--gold)', fontSize: '0.7rem', fontWeight: 700 }}>{bgShotJobs[lightbox.shotId]} generating</span>
                              </div>
                            )}
                            {lightbox.allMedia.length > 1 && <button className="tool-icon action-star" onClick={() => setLightboxCompare(true)} title="Compare"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>}
                          </div>
                        </div>
                        {lbVideoTrimOpen && (
                          <div className="video-trim-panel glass" onClick={(event) => event.stopPropagation()}>
                            <div className="video-trim-row">
                              <span>{lbVideoTrimStart.toFixed(1)}s</span>
                              <input
                                aria-label="Trim start"
                                max={Math.max(lbVideoDurationMeta, 1)}
                                min={0}
                                onChange={(event) => setLbVideoTrimStart(Math.min(Number(event.target.value), lbVideoTrimEnd || lbVideoDurationMeta || Number(event.target.value)))}
                                step={0.1}
                                type="range"
                                value={lbVideoTrimStart}
                              />
                              <span>{(lbVideoTrimEnd || lbVideoDurationMeta || 0).toFixed(1)}s</span>
                              <input
                                aria-label="Trim end"
                                max={Math.max(lbVideoDurationMeta, 1)}
                                min={0}
                                onChange={(event) => setLbVideoTrimEnd(Math.max(Number(event.target.value), lbVideoTrimStart))}
                                step={0.1}
                                type="range"
                                value={lbVideoTrimEnd || lbVideoDurationMeta || 0}
                              />
                            </div>
                            <div className="video-trim-actions">
                              <button type="button" onClick={applyLightboxVideoTrim}>Apply trim</button>
                              <button type="button" onClick={splitLightboxVideoAtCurrentTime}>Split here</button>
                              <button type="button" onClick={resetLightboxVideoTrim}>Reset</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {/* Note area */}
                    {(lbNoteOpen || lightboxToolMode !== 'normal') && (
                      <div style={{ 
                        position: 'absolute', 
                        top: lightboxToolMode === 'extend' ? 'auto' : lightboxToolMode === '3d-camera' ? 'calc(100% + 1rem + 8vh)' : 'calc(100% + 1rem)', 
                        bottom: lightboxToolMode === 'extend' ? '-6vh' : 'auto',
                        left: lightboxToolMode !== 'normal' ? '5rem' : 0, 
                        right: lightboxToolMode !== 'normal' ? '5rem' : 0, 
                        zIndex: 6, display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'all 0.3s ease' 
                      }}>
                        
                        {/* Mode specific top-right buttons removed — now in top bar as icons */}

                        <div className="floating-note-area glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', ...(lightboxToolMode === 'extend' ? { borderBottom: 'none', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}) }}>
                          <div style={{ position: 'relative' }}>
                            <textarea placeholder={lightboxToolMode === 'extend' ? "Add details what you want to see on the expanded sides of the image, be specific and detailed." : "Leave an iteration note..."} value={lbNote} onChange={(e) => setLbNote(e.target.value)} rows={4} style={{ background: 'transparent', border: 'none', color: 'var(--cream)', outline: 'none', width: '100%', fontSize: '0.95rem', resize: 'vertical', lineHeight: 1.5, minHeight: '4.5em', maxHeight: '18rem', overflowY: 'auto', paddingRight: '2.5rem' }} />
                            {/* Inject last prompt button — top right of textarea */}
                            {lbShotPrompt && lightboxToolMode !== 'extend' && (
                              <button type="button" onClick={() => setLbNote(lbShotPrompt)} title="Inject last generation prompt" style={{ position: 'absolute', top: '0.2rem', right: '0.2rem', width: '2rem', height: '2rem', borderRadius: '50%', border: '1.5px solid rgba(64,255,156,0.35)', background: 'rgba(64,255,156,0.08)', color: 'rgba(64,255,156,0.7)', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: '0.8rem', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(64,255,156,0.2)'; e.currentTarget.style.borderColor = 'rgba(64,255,156,0.6)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(64,255,156,0.08)'; e.currentTarget.style.borderColor = 'rgba(64,255,156,0.35)' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                              </button>
                            )}
                          </div>
                        {/* Single toolbar row: [icons LEFT] [attachments CENTERED] [OK RIGHT] */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
	                          <button className="tool-icon" onClick={() => setLbAttachOpen(true)} title="Attach reference media" style={{ width: '2.4rem', height: '2.4rem' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
                          <button className={`tool-icon ${lbAiEnhancing ? 'is-active' : ''}`} disabled={lbAiEnhancing || !lbNote.trim()} onClick={async () => {
                            setLbAiEnhancing(true)
                            try {
                              // Load skill content as system instruction (not part of prompt)
                              let skillInstructions = ''
                              for (const sk of lbAttachedSkills) {
                                try {
                                  const r = await fetch('/api/skills/read-md', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sk.id }) })
                                  const d = await r.json()
                                  if (d.content) skillInstructions += `\n--- Skill: ${sk.name} ---\n${d.content.substring(0, 2000)}\n`
                                } catch {}
                              }
	                              const mediaKind = lightbox.media.type === 'video' || lightbox.mode === 'videos' ? 'video generation' : 'image generation'
	                              const feedback = skillInstructions
	                                ? `You MUST follow these skill instructions precisely and apply them to transform/restructure the prompt accordingly:\n${skillInstructions}\n\nApply the skill rules to the user's prompt. If the skill says to create a grid, make a grid prompt. If it says to use specific formatting, use that formatting. Do NOT just improve the prompt generically — APPLY the skill's specific rules and structure.`
	                                : `Enhance this for cinematic AI ${mediaKind}. Make it more detailed, vivid and precise. Add lighting, camera movement, mood, composition, subject motion and timing details if missing. Keep the original intent.`
	                              // Build media context for Gemini to understand the scene
	                              const mediaCtx = lightbox.media.url ? `\n\nYou are looking at a ${lightbox.media.type || 'media'} reference: ${lightbox.media.url}` : ''
	                              const attachCtx = lbAttachments.length > 0 ? `\nAttached reference media: ${lbAttachments.map((u, i) => `@ref${i + 1} = ${u}`).join(', ')}` : ''
	                              const result = await refinePrompt(lbNote, feedback + mediaCtx + attachCtx + '\n\nIMPORTANT: Output ONLY the final prompt text. Do NOT include any thinking, reasoning, commentary, or preamble. Just the raw prompt ready for generation.')
                              if (result.text) {
                                // Strip any agent thinking/preamble
                                let cleaned = result.text.replace(/^(Here'?s?|OK|Sure|I'?ll|Let me|Now I|The refined|The enhanced|Here is|Certainly|Of course)[^\n]*\n+/i, '').trim()
                                setLbNote(cleaned)
                              }
                            } catch {}
                            setLbAiEnhancing(false)
                          }} title="AI Enhance prompt (uses attached skills)" style={{ width: '2.4rem', height: '2.4rem' }}>{lbAiEnhancing ? <span style={{ fontSize: '0.7rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg>}</button>
                          <button className={`tool-icon ${lbSkillOpen ? 'is-active' : ''}`} onClick={() => { setLbSkillOpen(!lbSkillOpen); setLbModelConfigOpen(false); if (!lbSkillOpen) fetch('/api/skills/list').then(r => r.json()).then(d => setLbAvailableSkills(d.skills || [])).catch(() => {}) }} title="Inject skill" style={{ width: '2.4rem', height: '2.4rem' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></button>
                          <button className={`tool-icon ${lbModelConfigOpen ? 'is-active' : ''}`} onClick={() => { setLbModelConfigOpen(!lbModelConfigOpen); setLbSkillOpen(false) }} title="Model & generation config" style={{ width: '2.4rem', height: '2.4rem' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
                          {/* CENTER: attachments + skills (flex:1 centers them) */}
                          <div style={{ flex: 1, display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', minHeight: '2.4rem' }}>
                            {lbAttachments.map((url, i) => (
                              <div key={`att-${i}`} style={{ position: 'relative', width: '44px', height: '44px', borderRadius: '6px', overflow: 'hidden', border: lbDragIdx === i ? '2px solid var(--gold)' : '1px solid rgba(248,217,120,0.3)', flexShrink: 0, cursor: 'grab', opacity: lbDragIdx === i ? 0.5 : 1, transition: 'all 0.15s' }}
                                draggable onDragStart={() => setLbDragIdx(i)} onDragEnd={() => setLbDragIdx(null)} onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(248,217,120,0.8)' }} onDragLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(248,217,120,0.3)' }} onDrop={(e) => { e.currentTarget.style.borderColor = 'rgba(248,217,120,0.3)'; if (lbDragIdx !== null && lbDragIdx !== i) { setLbAttachments(prev => { const n = [...prev]; const [moved] = n.splice(lbDragIdx, 1); n.splice(i, 0, moved); return n }); setLbDragIdx(null) } }}>
                                {/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) ? (
                                  <video src={url} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                                ) : /\.(mp3|wav|m4a|aac|ogg)(\?|$)/i.test(url) ? (
                                  <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--gold)', fontSize: '1rem', background: 'rgba(0,0,0,0.35)' }}>♪</div>
                                ) : (
                                  <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Ref ${i + 1}`} />
                                )}
                                <div style={{ position: 'absolute', top: 0, left: 0, background: 'rgba(0,0,0,0.7)', borderRadius: '0 0 4px 0', padding: '0 3px', fontSize: '0.5rem', color: 'var(--gold)', fontWeight: 700 }}>{i + 1}</div>
                                <button type="button" onClick={() => setLbAttachments(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: '1px', right: '1px', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.55rem', borderRadius: '50%', width: '14px', height: '14px', display: 'grid', placeItems: 'center', padding: 0 }}>×</button>
                              </div>
                            ))}
                            {lbAttachedSkills.map(s => (
                              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.15rem 0.4rem', borderRadius: '999px', background: 'rgba(248,217,120,0.08)', border: '1px solid rgba(248,217,120,0.2)', fontSize: '0.55rem', color: 'var(--gold)' }}>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                                {s.name}
                                <button type="button" onClick={() => setLbAttachedSkills(prev => prev.filter(sk => sk.id !== s.id))} style={{ background: 'none', border: 'none', color: 'rgba(248,217,120,0.5)', cursor: 'pointer', fontSize: '0.65rem', padding: 0, lineHeight: 1 }}>×</button>
                              </div>
                            ))}
                            {lbAttachments.length === 0 && lbAttachedSkills.length === 0 && (
                              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem' }}>{lbAttachments.length}/8 · {lightbox.mode === 'videos' ? lbVideoModel : `${Object.values(lbSelectedModels).filter(Boolean).length}m`}</span>
                            )}
                          </div>
                          {/* RIGHT: OK button */}
                          <button className="tick-save-btn" style={{ flexShrink: 0 }} disabled={lbProcessing} onClick={() => {
                            if (!lbNote.trim() && lbAttachments.length === 0) { setLbNoteOpen(false); return }
                            // Model quality map
                            const modelQuality: Record<string, string> = { 'gemini-3.1-flash': '2160p', 'gemini-3.0': '1440p', 'gpt-image-2.0': '1440p', 'seedream-4.5': '2160p', 'seedream-5.0-lite': '1440p' }
                            // Capture values before closing lightbox
                            const capturedLightbox = { ...lightbox }
                            const capturedNote = lbNote
                            const capturedAttachments = [...lbAttachments]
                            const capturedAspectRatio = lbAspectRatio
                            const capturedEmptyMode = lbEmptyMode
                            const isVideoTarget = capturedLightbox.mode === 'videos' || capturedLightbox.media?.type === 'video'
                            const activeModels = isVideoTarget ? [lbVideoModel] : Object.entries(lbSelectedModels).filter(([, v]) => v).map(([k]) => k)
                            console.log('[submit] activeModels:', activeModels, 'batchSize:', lbBatchSize, 'selectedModels state:', lbSelectedModels, 'videoTarget:', isVideoTarget)
                            if (activeModels.length === 0) activeModels.push(isVideoTarget ? 'seedance-2.0-standard' : 'gemini-3.1-flash')
                            const totalJobs = activeModels.length * lbBatchSize
                            setBgGenerating(prev => prev + totalJobs)
                            setBgShotJobs(prev => ({ ...prev, [capturedLightbox.shotId]: (prev[capturedLightbox.shotId] || 0) + totalJobs }))
                            // Inject prompt into shot
                            setStoryboard(prev => {
                              const next = JSON.parse(JSON.stringify(prev)) as StoryboardData
                              const act = next.acts.find(a => a.id === capturedLightbox.actId)
                              if (act) {
                                const scene = act.scenes.find(s => s.id === capturedLightbox.sceneId)
                                if (scene) {
                                  const shotsKey = capturedLightbox.mode === 'videos' ? 'videoShots' : capturedLightbox.mode === 'audio' ? 'audioShots' : 'imageShots'
                                  const shot = (scene[shotsKey] || []).find(s => s.id === capturedLightbox.shotId)
                                  if (shot) shot.prompt = capturedNote
                                }
                              }
                              return next
                            })
                            // Swoop animation: animate a pill from note area to bottom-right
                            const swooper = document.createElement('div')
                            swooper.textContent = `▶ ${totalJobs} ${isVideoTarget ? 'video' : 'image'}${totalJobs > 1 ? 's' : ''}`
                            Object.assign(swooper.style, {
                              position: 'fixed', zIndex: '99999',
                              top: '50%', left: '50%',
                              transform: 'translate(-50%, -50%) scale(1.2)',
                              padding: '0.65rem 1.6rem', borderRadius: '999px',
                              background: 'linear-gradient(135deg, rgba(248,217,120,0.22), rgba(248,217,120,0.08))',
                              border: '1px solid rgba(248,217,120,0.5)',
                              color: '#f8d978', fontSize: '1.1rem', fontWeight: '700',
                              backdropFilter: 'blur(16px)', boxShadow: '0 12px 40px rgba(248,217,120,0.3), 0 0 60px rgba(248,217,120,0.1)',
                              transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                              pointerEvents: 'none', opacity: '1',
                              letterSpacing: '0.05em',
                            })
                            document.body.appendChild(swooper)
                            // Need two rAFs for the browser to register the initial position
                            requestAnimationFrame(() => requestAnimationFrame(() => {
                              Object.assign(swooper.style, {
                                top: 'calc(100vh - 2.5rem)', left: 'calc(100vw - 8rem)',
                                transform: 'translate(0, 0) scale(0.5)',
                                opacity: '0',
                              })
                            }))
                            setTimeout(() => swooper.remove(), 800)
                            // Close note area — generation continues in background
                            setLbNoteOpen(false); setLbSkillOpen(false); setLbModelConfigOpen(false)
                            // Fire all requests in background
                            activeModels.forEach(mdl => {
                              for (let bi = 0; bi < lbBatchSize; bi++) {
                                const q = isVideoTarget ? lbVideoQuality : (modelQuality[mdl] || '1440p')
                                const payload: Record<string, any> = {
                                  imageUrl: capturedLightbox.media?.url || '',
                                  note: capturedNote,
                                  attachments: capturedAttachments,
                                  shotId: capturedLightbox.shotId,
                                  actId: capturedLightbox.actId,
                                  sceneId: capturedLightbox.sceneId,
                                  mode: capturedLightbox.mode,
                                  type: isVideoTarget ? 'video' : (capturedEmptyMode ? 'generate' : 'note'),
                                  model: mdl,
                                  quality: q,
                                  aspectRatio: capturedAspectRatio,
                                }
                                if (isVideoTarget) payload.duration = lbVideoDuration
                                if (mdl === 'gpt-image-2.0') payload.detailLevel = 'medium'
                                // Pass skill IDs so backend can read them
                                if (lbAttachedSkills.length > 0) payload.skillIds = lbAttachedSkills.map(s => s.id)
                                fetch('/api/tasks/edit-from-lightbox', {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(payload)
                                }).then(r => r.json()).then(data => {
                                  if (data.pending && data.jobId) {
                                    pollPendingVideoJob(data.jobId, {
                                      actId: capturedLightbox.actId,
                                      sceneId: capturedLightbox.sceneId,
                                      mode: capturedLightbox.mode,
                                      shotId: capturedLightbox.shotId,
                                      model: mdl,
                                      batchIndex: bi,
                                    })
                                    return
                                  }
                                  setBgGenerating(prev => Math.max(0, prev - 1))
                                  setBgShotJobs(prev => ({ ...prev, [capturedLightbox.shotId]: Math.max(0, (prev[capturedLightbox.shotId] || 0) - 1) }))
                                  if (data.url) {
                                    // Add cache-busting so image shows immediately without reload
                                    const cacheBust = data.url + (data.url.includes('?') ? '&' : '?') + 't=' + Date.now()
                                    const nm: StoryboardMedia = {
                                      id: `media-${mdl}-${Date.now()}-${bi}`,
                                      type: isVideoTarget ? 'video' : 'image',
                                      url: cacheBust,
                                      fileName: `${mdl}-${Date.now()}${isVideoTarget ? '.mp4' : '.png'}`,
                                      localPath: data.localPath,
                                      createdAt: new Date().toISOString(),
                                    }
                                    injectResultMedia(capturedLightbox.actId, capturedLightbox.sceneId, capturedLightbox.mode, capturedLightbox.shotId, [nm])
                                  }
                                }).catch(() => {
                                  setBgGenerating(prev => Math.max(0, prev - 1))
                                  setBgShotJobs(prev => ({ ...prev, [capturedLightbox.shotId]: Math.max(0, (prev[capturedLightbox.shotId] || 0) - 1) }))
                                })
                              }
                            })
                          }}>{lbProcessing ? <span style={{ fontSize: '0.6rem' }}>⏳</span> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}</button>
                        </div>
                      </div>
                      </div>
                    )}
                    {/* SKILLS STORE MODAL — OUTSIDE note area to avoid backdrop-filter containing block */}
                    {lbSkillOpen && <LbSkillStoreModal lbAvailableSkills={lbAvailableSkills} lbAttachedSkills={lbAttachedSkills} setLbAttachedSkills={setLbAttachedSkills} setLbSkillOpen={setLbSkillOpen} setLbAvailableSkills={setLbAvailableSkills} lbSkillsPage={lbSkillsPage} setLbSkillsPage={setLbSkillsPage} onInjectPrompt={(text: string) => { setLbNote(text); setLbSkillOpen(false); setLbNoteOpen(true); }} />}
                    {/* Model & Generation Config popup — OUTSIDE note area */}
                    {lbNoteOpen && lbModelConfigOpen && (
                          <>
                          {/* Click-outside backdrop */}
                          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setLbModelConfigOpen(false)} />
                          <div style={{ position: 'absolute', bottom: 0, left: 0, zIndex: 11, background: 'rgba(10,12,20,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(248,217,120,0.2)', borderRadius: '1rem', padding: '1.2rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.7rem', minWidth: '380px', boxShadow: '0 -12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(248,217,120,0.04)' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.03em' }}>{lightbox.mode === 'videos' ? 'Video Generation' : 'Generation Models'}</div>
                            {lightbox.mode === 'videos' ? (
                              <>
                                <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>
                                  Model
                                  <select value={lbVideoModel} onChange={(event) => setLbVideoModel(event.target.value)} style={{ padding: '0.55rem 0.7rem', borderRadius: '0.55rem', border: '1px solid rgba(248,217,120,0.22)', background: 'rgba(255,255,255,0.06)', color: 'var(--cream)' }}>
                                    <option value="seedance-2.0-standard">Seedance 2.0 Standard</option>
                                    <option value="v6">PixVerse 6</option>
                                    <option value="pixverse-c1">PixVerse C1</option>
                                    <option value="happyhorse-1.0">Happy Horse</option>
                                    <option value="kling-3.0-standard">Kling 3.0</option>
                                    <option value="kling-o3-standard">Kling O3</option>
                                    <option value="grok-imagine">Grok</option>
                                  </select>
                                </label>
                                <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
                                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>Quality</div>
                                  {['720p', '1080p'].map(q => (
                                    <button key={q} type="button" onClick={() => setLbVideoQuality(q)} style={{ padding: '0.25rem 0.6rem', borderRadius: '0.4rem', border: `1px solid ${lbVideoQuality === q ? 'rgba(248,217,120,0.4)' : 'rgba(255,255,255,0.08)'}`, background: lbVideoQuality === q ? 'rgba(248,217,120,0.08)' : 'transparent', color: lbVideoQuality === q ? 'var(--gold)' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.8rem' }}>{q}</button>
                                  ))}
                                </div>
                                <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>
                                  Duration: {lbVideoDuration}s
                                  <input type="range" min="1" max="15" value={lbVideoDuration} onChange={(event) => setLbVideoDuration(Number(event.target.value))} style={{ accentColor: 'var(--gold)' }} />
                                </label>
                              </>
                            ) : ([
                                { key: 'gemini-3.1-flash', label: 'Nano Banana 2', res: '4K', quality: '2160p', def: true },
                                { key: 'gemini-3.0', label: 'Nano Banana Pro', res: '2K', quality: '1440p', def: true },
                                { key: 'gpt-image-2.0', label: 'GPT-2 Medium', res: '2K', quality: '1440p', def: true },
                                { key: 'seedream-4.5', label: 'SeedReam 4.5', res: '4K', quality: '2160p', def: false },
                                { key: 'seedream-5.0-lite', label: 'SeedReam 5 Lite', res: '3K', quality: '1440p', def: false },
                              ] as const).map(m => (
                                <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: lbSelectedModels[m.key] ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)', cursor: 'pointer', padding: '0.3rem 0' }}>
                                  <input type="checkbox" checked={!!lbSelectedModels[m.key]} onChange={() => setLbSelectedModels(prev => ({ ...prev, [m.key]: !prev[m.key] }))} style={{ accentColor: 'var(--gold)', width: '16px', height: '16px' }} />
                                  {m.label} <span style={{ color: 'rgba(248,217,120,0.5)', fontSize: '0.75rem' }}>{m.res}</span>
                                  {m.def && <span style={{ color: 'rgba(64,255,156,0.5)', fontSize: '0.65rem', marginLeft: 'auto' }}>default</span>}
                                </label>
                              ))}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem', display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
                              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>Aspect</div>
                              {['16:9', '9:16', '1:1', '4:3'].map(ar => (
                                <button key={ar} type="button" onClick={() => setLbAspectRatio(ar)} style={{ padding: '0.25rem 0.6rem', borderRadius: '0.4rem', border: `1px solid ${lbAspectRatio === ar ? 'rgba(248,217,120,0.4)' : 'rgba(255,255,255,0.08)'}`, background: lbAspectRatio === ar ? 'rgba(248,217,120,0.08)' : 'transparent', color: lbAspectRatio === ar ? 'var(--gold)' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.8rem' }}>{ar}</button>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>Batch ×</div>
                              {[1, 2, 3].map(n => (
                                <button key={n} type="button" onClick={() => setLbBatchSize(n)} style={{ padding: '0.25rem 0.6rem', borderRadius: '0.4rem', border: `1px solid ${lbBatchSize === n ? 'rgba(248,217,120,0.4)' : 'rgba(255,255,255,0.08)'}`, background: lbBatchSize === n ? 'rgba(248,217,120,0.08)' : 'transparent', color: lbBatchSize === n ? 'var(--gold)' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.8rem' }}>{n}</button>
                              ))}
                              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>{(lightbox.mode === 'videos' ? 1 : Object.values(lbSelectedModels).filter(Boolean).length) * lbBatchSize} total</span>
                            </div>
                          </div>
                          </>
                        )}
                  </div>
                )}
              </div>
              {/* Alternatives row — paginated, max 8 per page */}
              {lightbox.allMedia.length >= 1 && (() => {
                const perPage = 8
                const totalAlts = lightbox.allMedia.length
                const totalPages = Math.ceil(totalAlts / perPage)
                const page = Math.min(lbAltPage, totalPages - 1)
                const visibleAlts = lightbox.allMedia.slice(page * perPage, page * perPage + perPage)
                const isLastPage = page >= totalPages - 1
                return (
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                  {/* Left arrow */}
                  {page > 0 && (
                    <button type="button" onClick={() => setLbAltPage(p => Math.max(0, p - 1))} style={{ width: '32px', height: '52px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.1rem', display: 'grid', placeItems: 'center', transition: 'background 0.2s', flexShrink: 0 }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,217,120,0.15)'; e.currentTarget.style.color = 'var(--gold)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>‹</button>
                  )}
                  {/* Empty "+" slot — only on first page */}
                  {page === 0 && (
                    <button type="button" onClick={() => { setLbEmptyMode(true); setLbNoteOpen(true); setLightbox({ ...lightbox, media: { id: 'empty-new', type: lightbox.mode === 'videos' ? 'video' : lightbox.mode === 'audio' ? 'audio' : 'image', url: '', fileName: '', createdAt: new Date().toISOString() } }) }} title="Create new from scratch" className="lb-plus-btn" style={{ width: '52px', height: '52px', borderRadius: '8px', border: '1px dashed rgba(248,217,120,0.35)', background: 'rgba(248,217,120,0.04)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'rgba(248,217,120,0.5)', fontSize: '1.5rem', fontWeight: 300, transition: 'all 0.2s', padding: 0, flexShrink: 0 }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,217,120,0.12)'; e.currentTarget.style.borderColor = 'rgba(248,217,120,0.6)'; e.currentTarget.style.color = '#f8d978' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(248,217,120,0.04)'; e.currentTarget.style.borderColor = 'rgba(248,217,120,0.35)'; e.currentTarget.style.color = 'rgba(248,217,120,0.5)' }}>+</button>
                  )}
                  {visibleAlts.map((m, idx) => (
                    <button key={m.id} type="button" onClick={() => { setLightbox({ ...lightbox, media: m }); setLbEmptyMode(false); setLocalToolImage(null) }} style={{ width: m.id === lightbox.media.id ? '64px' : '52px', height: m.id === lightbox.media.id ? '64px' : '52px', borderRadius: '8px', overflow: 'hidden', border: m.id === lightbox.media.id ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', padding: 0, background: 'transparent', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)', opacity: m.id === lightbox.media.id ? 1 : 0.6, transform: m.id === lightbox.media.id ? 'translateY(-4px)' : 'none', boxShadow: m.id === lightbox.media.id ? '0 8px 20px rgba(248,217,120,0.15)' : 'none', flexShrink: 0 }}>
                      {m.type === 'image' && m.url ? <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Alt ${page * perPage + idx + 1}`} /> : m.type === 'video' && m.url ? <video src={m.url} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{!m.url ? '∅' : page * perPage + idx + 1}</div>}
                    </button>
                  ))}
                  {/* Right arrow */}
                  {totalPages > 1 && !isLastPage && (
                    <button type="button" onClick={() => setLbAltPage(p => Math.min(totalPages - 1, p + 1))} style={{ width: '32px', height: '52px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.1rem', display: 'grid', placeItems: 'center', transition: 'background 0.2s', flexShrink: 0 }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,217,120,0.15)'; e.currentTarget.style.color = 'var(--gold)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>›</button>
                  )}
                </div>
                )
              })()}
              </>)
              })()}
            </div>
          ) : (() => {
            const alts = lightbox.allMedia.filter(m => m.id !== lightbox.media.id)
            const compPerPage = 8
            const compTotalPages = Math.ceil(alts.length / compPerPage)
            const compPage = Math.min(lbAltPage, compTotalPages - 1)
            const compVisible = alts.slice(compPage * compPerPage, compPage * compPerPage + compPerPage)
            const hasMany = compVisible.length > 4
            const mainFlex = hasMany ? '0 0 42%' : '0 0 50%'
            const altH = hasMany ? `${Math.floor(70 / 4)}vh` : `${Math.floor(72 / Math.max(compVisible.length, 1))}vh`
            return (
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', maxWidth: '95vw', maxHeight: '90vh', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ flex: mainFlex, position: 'relative' }}>
                {lightbox.media.type === 'image' ? <img src={lightbox.media.url} alt="Main" style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '1rem', display: 'block' }} /> : <video src={getTrimmedVideoSrc(lightbox.media)} controls autoPlay={lbCompareSync} style={{ width: '100%', maxHeight: '80vh', borderRadius: '1rem' }} />}
                <div style={{ position: 'absolute', bottom: '0.8rem', left: '0.8rem', background: 'rgba(0,0,0,0.6)', padding: '0.3rem 0.8rem', borderRadius: '1rem', color: 'var(--gold)', fontSize: '0.7rem', fontWeight: 700 }}>MAIN</div>
                <button type="button" onClick={() => setLightboxCompare(false)} style={{ position: 'absolute', bottom: '0.8rem', right: '0.8rem', padding: '0.4rem 1rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(248,217,120,0.25)', borderRadius: '2rem', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>← Normal</button>
                {lightbox.mode === 'videos' && <button type="button" onClick={() => setLbCompareSync(!lbCompareSync)} style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', padding: '0.35rem 0.8rem', background: 'rgba(0,0,0,0.58)', border: '1px solid rgba(248,217,120,0.25)', borderRadius: '2rem', color: lbCompareSync ? 'var(--gold)' : 'rgba(255,255,255,0.62)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 800 }}>{lbCompareSync ? 'SYNC' : 'MANUAL'}</button>}
              </div>
              <div style={{ flex: hasMany ? '0 0 52%' : '0 0 45%', display: 'flex', gap: hasMany ? '1rem' : '0.5rem', flexDirection: hasMany ? 'row' : 'column', position: 'relative' }}>
                {/* Compare page arrows */}
                {compTotalPages > 1 && (
                  <div style={{ position: 'absolute', top: '-2rem', right: 0, display: 'flex', gap: '0.3rem', zIndex: 5 }}>
                    <button type="button" disabled={compPage === 0} onClick={() => setLbAltPage(p => Math.max(0, p - 1))} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: compPage > 0 ? 'rgba(248,217,120,0.12)' : 'rgba(255,255,255,0.04)', color: compPage > 0 ? 'var(--gold)' : 'rgba(255,255,255,0.2)', cursor: compPage > 0 ? 'pointer' : 'default', fontSize: '0.9rem', display: 'grid', placeItems: 'center' }}>‹</button>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', display: 'grid', placeItems: 'center' }}>{compPage + 1}/{compTotalPages}</span>
                    <button type="button" disabled={compPage >= compTotalPages - 1} onClick={() => setLbAltPage(p => Math.min(compTotalPages - 1, p + 1))} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: compPage < compTotalPages - 1 ? 'rgba(248,217,120,0.12)' : 'rgba(255,255,255,0.04)', color: compPage < compTotalPages - 1 ? 'var(--gold)' : 'rgba(255,255,255,0.2)', cursor: compPage < compTotalPages - 1 ? 'pointer' : 'default', fontSize: '0.9rem', display: 'grid', placeItems: 'center' }}>›</button>
                  </div>
                )}
                {hasMany ? (<>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {compVisible.slice(0, 4).map((m, idx) => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', animation: `fadeIn 0.3s ease ${idx * 0.05}s both` }}>
                        <div style={{ width: '28px', height: '2px', background: 'linear-gradient(90deg, rgba(248,217,120,0.5), rgba(248,217,120,0.1))', flexShrink: 0 }} />
                        <button type="button" onClick={() => setLightbox({ ...lightbox, media: m })} style={{ borderRadius: '0.5rem', overflow: 'hidden', border: 'none', cursor: 'pointer', padding: 0, background: 'none', width: '100%', height: altH }}>
                          {m.type === 'video' ? <video src={getTrimmedVideoSrc(m)} muted autoPlay={lbCompareSync} loop={lbCompareSync} playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem' }} /> : <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem' }} alt={`Alt ${compPage * compPerPage + idx + 1}`} />}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {compVisible.slice(4, 8).map((m, idx) => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', animation: `fadeIn 0.3s ease ${(idx + 4) * 0.05}s both` }}>
                        <div style={{ width: '28px', height: '2px', background: 'linear-gradient(90deg, rgba(248,217,120,0.5), rgba(248,217,120,0.1))', flexShrink: 0 }} />
                        <button type="button" onClick={() => setLightbox({ ...lightbox, media: m })} style={{ borderRadius: '0.5rem', overflow: 'hidden', border: 'none', cursor: 'pointer', padding: 0, background: 'none', width: '100%', height: altH }}>
                          {m.type === 'video' ? <video src={getTrimmedVideoSrc(m)} muted autoPlay={lbCompareSync} loop={lbCompareSync} playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem' }} /> : <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem' }} alt={`Alt ${compPage * compPerPage + idx + 5}`} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </>) : (
                  compVisible.map((m, idx) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', animation: `fadeIn 0.3s ease ${idx * 0.08}s both` }}>
                      <div style={{ width: '36px', height: '2px', background: 'linear-gradient(90deg, rgba(248,217,120,0.5), rgba(248,217,120,0.1))', flexShrink: 0 }} />
                      <button type="button" onClick={() => setLightbox({ ...lightbox, media: m })} style={{ borderRadius: '0.6rem', overflow: 'hidden', border: 'none', cursor: 'pointer', padding: 0, background: 'none', width: '100%', height: altH }}>
                        {m.type === 'video' ? <video src={getTrimmedVideoSrc(m)} muted autoPlay={lbCompareSync} loop={lbCompareSync} playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.6rem' }} /> : <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.6rem' }} alt={`Alt ${compPage * compPerPage + idx + 1}`} />}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            )
          })()}
          {/* Crop Tool Overlay */}
          {lightboxCrop && lightbox.media.type === 'image' && (
            <CropTool
              key={`crop-${lightbox.media.id}`}
              imageUrl={lightbox.media.url}
              onClose={() => setLightboxCrop(false)}
              onApply={(croppedUrl) => {
                // Preload the image before updating state to avoid broken icon
                const cacheBusted = croppedUrl + '?t=' + Date.now()
                const preload = new Image()
                preload.onload = () => {
                  setLightboxCrop(false)
                  if (lightbox.shotId && lightbox.actId) {
                    const newMedia: StoryboardMedia = {
                      id: `media-crop-${Date.now()}`,
                      type: 'image',
                      url: cacheBusted,
                      fileName: `cropped-${Date.now()}.png`,
                    }
                    updateShot(lightbox.actId, lightbox.sceneId, lightbox.mode, lightbox.shotId, (shot) => {
                      shot.media.push(newMedia)
                      shot.selectedMediaId = newMedia.id
                    })
                    const updatedAllMedia = [...lightbox.allMedia, newMedia]
                    setLightbox({ ...lightbox, media: newMedia, allMedia: updatedAllMedia })
                  }
                }
                preload.onerror = () => {
                  // Retry once after 500ms if file not ready yet
                  setTimeout(() => { setLightboxCrop(false); setLightbox({ ...lightbox, media: { ...lightbox.media, url: cacheBusted }, allMedia: [...lightbox.allMedia] }) }, 500)
                }
                preload.src = cacheBusted
              }}
            />
          )}
          {/* Enhance popup */}
          {lbEnhanceOpen && lightbox.media.type === 'image' && (
            <div className="enhance-menu-glass glass" onClick={(e) => e.stopPropagation()}>
              <div className="assign-menu-title">Quality Enhancement</div>
              {/* Editable prompt textarea with inject button */}
              <div style={{ position: 'relative' }}>
                <textarea
                  className="enhance-prompt-input"
                  placeholder="Describe enhancements or leave empty for auto-enhance..."
                  value={lbEnhancePrompt}
                  onChange={(e) => setLbEnhancePrompt(e.target.value)}
                  rows={3}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(248,217,120,0.15)', borderRadius: '0.6rem', color: 'var(--cream)', padding: '0.7rem 2.5rem 0.7rem 0.7rem', fontSize: '0.9rem', resize: 'vertical', outline: 'none', lineHeight: 1.5, minHeight: '3rem' }}
                />
                {/* Inject prompt from shot */}
                <button type="button" onClick={() => { const act = storyboard.acts.find(a => a.id === lightbox.actId); const sc = act?.scenes.find(s => s.id === lightbox.sceneId); const shots = sc ? (lightbox.mode === 'images' ? sc.imageShots : lightbox.mode === 'videos' ? sc.videoShots : sc.audioShots) : []; const shot = shots.find(s => s.id === lightbox.shotId); if (shot?.prompt) setLbEnhancePrompt(shot.prompt) }} title="Inject shot prompt" style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', width: '1.8rem', height: '1.8rem', borderRadius: '50%', border: '1.5px solid rgba(64,255,156,0.3)', background: 'rgba(64,255,156,0.06)', color: 'rgba(64,255,156,0.6)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                </button>
              </div>
              <div className="enhance-options-row">
                <select className="enhance-select" value={lbModel} onChange={(e) => setLbModel(e.target.value)}>
                  <option value="gemini-3.1-flash">Nano Banana 2</option>
                  <option value="gemini-3.0">Nano Banana Pro</option>
                  <option value="gpt-image-2.0">GPT-2 Medium</option>
                  <option value="seedream-4.5">SeedReam 4.5</option>
                  <option value="seedream-5.0-lite">SeedReam 5 Lite</option>
                </select>
                <select className="enhance-select" value={lbQuality} onChange={(e) => setLbQuality(e.target.value)}>
                  <option value="2160p">4K (2160p)</option>
                  <option value="1440p">2K (1440p)</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.3rem' }}>
                <button className="tick-save-btn" disabled={lbProcessing} onClick={() => {
                  // Run enhance in background — close popup immediately
                  const capturedLightbox = { ...lightbox }
                  const capturedModel = lbModel
                  const capturedQuality = lbQuality
                  const capturedPrompt = lbEnhancePrompt.trim()
                  const shotId = lightbox.shotId
                  setLbEnhanceOpen(false)
                  setBgGenerating(prev => prev + 1)
                  setBgShotJobs(prev => ({ ...prev, [shotId]: (prev[shotId] || 0) + 1 }))
                  // Fire and forget
                  ;(async () => {
                    try {
                      const res = await fetch('/api/tasks/edit-from-lightbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: capturedLightbox.media.url, attachments: [], shotId: capturedLightbox.shotId, actId: capturedLightbox.actId, sceneId: capturedLightbox.sceneId, mode: capturedLightbox.mode, type: 'enhance', model: capturedModel, quality: capturedQuality, prompt: capturedPrompt }) })
                      const data = await res.json()
                      if (data.url) {
                        const cacheBust = data.url + (data.url.includes('?') ? '&' : '?') + 't=' + Date.now()
                        const newMedia: StoryboardMedia = { id: `media-enhance-${Date.now()}`, type: 'image', url: cacheBust, fileName: `enhanced-${capturedModel}-${capturedQuality}-${Date.now()}.png`, localPath: data.localPath }
                        injectResultMedia(capturedLightbox.actId, capturedLightbox.sceneId, capturedLightbox.mode, capturedLightbox.shotId, [newMedia])
                      }
                    } catch {}
                    setBgGenerating(prev => Math.max(0, prev - 1))
                    setBgShotJobs(prev => ({ ...prev, [shotId]: Math.max(0, (prev[shotId] || 0) - 1) }))
                  })()
                }}>{lbProcessing ? <span style={{ fontSize: '0.6rem' }}>⏳</span> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}</button>
              </div>
              <button type="button" onClick={() => setLbEnhanceOpen(false)} style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
          )}
          {/* Split Grid */}
          {lbSplitOpen && lightbox.media.type === 'image' && (
            <div className="assign-menu-glass glass" onClick={(e) => e.stopPropagation()}>
              <div className="assign-menu-title">Split Grid</div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                {['2x2', '3x3', '2x1', '1x2'].map(s => (
                  <button key={s} type="button" onClick={() => setLbSplitSize(s)} style={{ padding: '0.4rem 0.9rem', borderRadius: '2rem', border: lbSplitSize === s ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.15)', background: lbSplitSize === s ? 'rgba(248,217,120,0.12)' : 'rgba(255,255,255,0.05)', color: lbSplitSize === s ? 'var(--gold)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: lbSplitSize === s ? 700 : 400 }}>{s}</button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button className="tick-save-btn" disabled={lbProcessing} onClick={async () => {
                  setLbProcessing(true)
                  try {
                    const res = await fetch('/api/tasks/edit-from-lightbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: lightbox.media.url, shotId: lightbox.shotId, actId: lightbox.actId, sceneId: lightbox.sceneId, mode: lightbox.mode, type: 'split', splitSize: lbSplitSize }) })
                    const data = await res.json()
                    if (data.panels && data.panels.length > 0) {
                      const panelMedia: StoryboardMedia[] = data.panels.map((p: any) => ({ id: p.id || `media-split-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, type: 'image' as const, url: (p.url || '') + '?t=' + Date.now(), fileName: p.fileName || `split-panel.png`, localPath: p.localPath }))
                      injectResultMedia(lightbox.actId, lightbox.sceneId, lightbox.mode, lightbox.shotId, panelMedia)
                      setLightbox({ ...lightbox, media: panelMedia[0], allMedia: [...lightbox.allMedia, ...panelMedia] })
                    }
                  } catch {}
                  setLbProcessing(false); setLbSplitOpen(false)
                }}>{lbProcessing ? <span style={{ fontSize: '0.6rem' }}>⏳</span> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}</button>
              </div>
              <button type="button" onClick={() => setLbSplitOpen(false)} style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
          )}
          {/* Assign to scene popup — tabbed: Image | Actor | Scene | Props */}
          {lbAssignOpen && (() => {
            const assignTabs = [
              { key: 'image' as const, label: 'Image', icon: 'M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
              { key: 'actor' as const, label: 'Actor', icon: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z' },
              { key: 'scene' as const, label: 'Location', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z' },
              { key: 'props' as const, label: 'Props', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
            ]
            const doAssign = (resKey: 'actors' | 'locations' | 'props', name: string) => {
              if (!lightbox.media.url) return
              setStoryboard(prev => {
                const next = JSON.parse(JSON.stringify(prev))
                if (!next.resources[resKey]) next.resources[resKey] = []
                const existing = next.resources[resKey].find((x: any) => x.name === name)
                const entry = { id: `media-assign-${Date.now()}`, type: 'image', url: lightbox.media.url, fileName: lightbox.media.fileName }
                if (existing) { if (!existing.media) existing.media = []; existing.media.push(entry) }
                else { next.resources[resKey].push({ name, media: [entry] }) }
                if (lightbox.actId && lightbox.sceneId) {
                  const act = next.acts.find((a: any) => a.id === lightbox.actId)
                  const scene = act?.scenes.find((s: any) => s.id === lightbox.sceneId)
                  if (scene) {
                    if (!scene.resourceRefs) scene.resourceRefs = { actors: [], locations: [], props: [] }
                    if (!scene.resourceRefs[resKey]) scene.resourceRefs[resKey] = []
                    if (!scene.resourceRefs[resKey].includes(name)) scene.resourceRefs[resKey].push(name)
                  }
                }
                return next
              })
              setLbAssignOpen(false)
            }
            const renderResourceSlots = (resKey: 'actors' | 'locations' | 'props') => {
              const resources = storyboard.resources[resKey] || []
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {resources.map((r: any) => {
                    const img = (r.media || [])[0]
                    return (
                      <button key={r.name} type="button" onClick={() => doAssign(resKey, r.name)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.7rem', cursor: 'pointer', color: '#fff', transition: 'all 0.15s', width: '100%', textAlign: 'left' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(248,217,120,0.4)'; e.currentTarget.style.background = 'rgba(248,217,120,0.06)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}>
                        {img ? <img src={img.url} style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} alt="" /> : <div style={{ width: '64px', height: '64px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '1.6rem', flexShrink: 0 }}>∅</div>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>{(r.media || []).length} image{(r.media || []).length !== 1 ? 's' : ''}</div>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(64,255,156,0.5)', flexShrink: 0 }}>+ Add →</div>
                      </button>
                    )
                  })}
                  {/* Add new inline */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="text" value={lbAssignNewName} onChange={e => setLbAssignNewName(e.target.value)} placeholder={`New ${resKey === 'actors' ? 'actor' : resKey === 'locations' ? 'location' : 'prop'} name...`} style={{ flex: 1, padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '0.6rem', color: '#fff', fontSize: '1rem', outline: 'none' }} onKeyDown={e => { if (e.key === 'Enter' && lbAssignNewName.trim()) { doAssign(resKey, lbAssignNewName.trim()); setLbAssignNewName('') } }} />
                    <button type="button" disabled={!lbAssignNewName.trim()} onClick={() => { if (lbAssignNewName.trim()) { doAssign(resKey, lbAssignNewName.trim()); setLbAssignNewName('') } }} style={{ padding: '0.7rem 1.2rem', background: lbAssignNewName.trim() ? 'var(--gold)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '0.6rem', color: lbAssignNewName.trim() ? '#000' : 'rgba(255,255,255,0.2)', cursor: lbAssignNewName.trim() ? 'pointer' : 'default', fontSize: '0.95rem', fontWeight: 700, transition: 'all 0.15s' }}>+ Add</button>
                  </div>
                </div>
              )
            }
            return (
            <div className="assign-menu-glass glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '94vw', maxHeight: '85vh' }}>
              <div className="assign-menu-title" style={{ marginBottom: '0.6rem', fontSize: '1.3rem' }}>Assign to Scene</div>
              {/* Type tabs */}
              <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0' }}>
                {assignTabs.map(tab => (
                  <button key={tab.key} type="button" onClick={() => { setLbAssignTab(tab.key); setLbAssignNewName(''); setLbAssignExpandAct(null) }} style={{ padding: '0.7rem 1.2rem', border: 'none', borderBottom: lbAssignTab === tab.key ? '3px solid var(--gold)' : '3px solid transparent', background: 'none', color: lbAssignTab === tab.key ? 'var(--gold)' : 'rgba(255,255,255,0.4)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={tab.icon}/></svg>
                    {tab.label}
                  </button>
                ))}
              </div>
              {/* Tab content */}
              <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: '0.8rem 0' }}>
                {lbAssignTab === 'image' ? (
                  /* Image tab — show acts with + to expand */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {storyboard.acts.map(act => {
                      const isExpanded = lbAssignExpandAct === act.id
                      return (
                        <div key={act.id}>
                          <button type="button" onClick={() => setLbAssignExpandAct(isExpanded ? null : act.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.8rem 1rem', background: isExpanded ? 'rgba(248,217,120,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isExpanded ? 'rgba(248,217,120,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '0.6rem', cursor: 'pointer', color: isExpanded ? 'var(--gold)' : 'rgba(255,255,255,0.7)', fontSize: '1rem', fontWeight: 600, transition: 'all 0.15s', textAlign: 'left' }}>
                            <span style={{ fontSize: '0.9rem', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▸</span>
                            {act.title}
                            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>{act.scenes.length} scenes</span>
                          </button>
                          {isExpanded && (
                            <div style={{ padding: '0.5rem 0 0.5rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {act.scenes.map(scene => {
                                const shots = getSceneShots(scene, 'images')
                                const imgs = shots.flatMap(s => s.media.filter(m => m.type === 'image'))
                                return (
                                  <div key={scene.id}>
                                    <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: '0.4rem' }}>{scene.title}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.35rem' }}>
                                      {imgs.slice(0, 15).map(m => (
                                        <button key={m.id} type="button" onClick={() => {
                                          /* Add current lightbox image as new shot in this scene */
                                          if (!lightbox.media.url) return
                                          const newShot = { id: `shot-assign-${Date.now()}`, media: [{ id: `media-assign-${Date.now()}`, type: 'image' as const, url: lightbox.media.url, fileName: lightbox.media.fileName }], selectedMediaId: `media-assign-${Date.now()}` }
                                          updateShot(act.id, scene.id, 'images', shots[0]?.id || '', (draft) => { /* noop — we'll inject below */ })
                                          setStoryboard(prev => {
                                            const next = JSON.parse(JSON.stringify(prev))
                                            const a = next.acts.find((x: any) => x.id === act.id)
                                            const s = a?.scenes.find((x: any) => x.id === scene.id)
                                            if (s) { if (!s.passes) s.passes = {}; if (!s.passes.images) s.passes.images = []; s.passes.images.push(newShot) }
                                            return next
                                          })
                                          setLbAssignOpen(false)
                                        }} style={{ width: '100%', aspectRatio: '16/11', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', padding: 0, background: 'rgba(0,0,0,0.3)', opacity: 0.75, transition: 'all 0.15s' }}>
                                          <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        </button>
                                      ))}
                                      {/* + Add to this scene */}
                                      <button type="button" onClick={() => {
                                        if (!lightbox.media.url) return
                                        const newShotId = `shot-assign-${Date.now()}`
                                        const newMediaId = `media-assign-${Date.now()}`
                                        setStoryboard(prev => {
                                          const next = JSON.parse(JSON.stringify(prev))
                                          const a = next.acts.find((x: any) => x.id === act.id)
                                          const s = a?.scenes.find((x: any) => x.id === scene.id)
                                          if (s) { if (!s.passes) s.passes = {}; if (!s.passes.images) s.passes.images = []; s.passes.images.push({ id: newShotId, media: [{ id: newMediaId, type: 'image', url: lightbox.media.url, fileName: lightbox.media.fileName }], selectedMediaId: newMediaId }) }
                                          return next
                                        })
                                        setLbAssignOpen(false)
                                      }} style={{ width: '100%', aspectRatio: '16/11', borderRadius: '6px', border: '2px dashed rgba(248,217,120,0.3)', background: 'rgba(248,217,120,0.04)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'rgba(248,217,120,0.5)', fontSize: '1.8rem', transition: 'all 0.15s' }}>+</button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : lbAssignTab === 'actor' ? (
                  renderResourceSlots('actors')
                ) : lbAssignTab === 'scene' ? (
                  renderResourceSlots('locations')
                ) : (
                  renderResourceSlots('props')
                )}
              </div>
              <button type="button" onClick={() => setLbAssignOpen(false)} style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            )
          })()}
          {/* Attachment Picker popup — with Resource tabs, scene-filtering, preview images */}
          {lbAttachOpen && (() => {
            // Get resources for the active scene
            const lbActiveAct = storyboard.acts.find(a => a.id === lightbox?.actId)
            const lbActiveScene = lbActiveAct?.scenes.find(s => s.id === lightbox?.sceneId)
            const sceneActorRefs = lbActiveScene?.resourceRefs?.actors || []
            const sceneLocationRefs = lbActiveScene?.resourceRefs?.locations || []
            const scenePropRefs = lbActiveScene?.resourceRefs?.props || []

            // Filter resources: scene-assigned first, then show all if toggled
            const filterResources = (type: StoryboardResourceType) => {
              const all = storyboard.resources[type] || []
              if (lbAttachShowAll || lbAttachTab === 'all') return all
              const refs = type === 'actors' ? sceneActorRefs : type === 'locations' ? sceneLocationRefs : scenePropRefs
              const filtered = all.filter(r => refs.includes(r.name))
              return filtered.length > 0 ? filtered : all // fallback to all if none assigned
            }

            const tabs = [
              { key: 'all' as const, label: 'Images', icon: 'M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
              { key: 'actors' as const, label: 'Actors', icon: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z' },
              { key: 'locations' as const, label: 'Locations', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z' },
              { key: 'props' as const, label: 'Props', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
            ]

            return (
            <div className="assign-menu-glass glass" style={{ maxWidth: '800px', maxHeight: '85vh', width: '94vw' }} onClick={(e) => e.stopPropagation()}>
              <div className="assign-menu-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '1.3rem' }}>
                <span>Attach References ({lbAttachments.length}/8)</span>
                <button type="button" onClick={() => lbFileRef.current?.click()} style={{ padding: '0.5rem 1.2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '2rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.95rem' }}>↑ Upload</button>
              </div>
              <button type="button" onClick={() => { setLbAttachOpen(false); setLbAttachShowAll(false) }} style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.6rem' }}>✕</button>
              <input ref={lbFileRef} type="file" accept="image/*,video/*,audio/*" multiple style={{ display: 'none' }} onChange={(e) => {
                const files = Array.from(e.target.files || []).slice(0, 8 - lbAttachments.length)
                files.forEach(file => {
                  const formData = new FormData(); formData.append('file', file)
                  fetch('/api/storyboard/upload', { method: 'POST', body: formData }).then(r => r.json()).then(d => { if (d.url && lbAttachments.length < 8) { setLbAttachments(prev => prev.length < 8 ? [...prev, d.url] : prev) } }).catch(() => {})
                })
                e.target.value = ''
              }} />

              {/* Resource Type Tabs */}
              <div style={{ display: 'flex', gap: '0.4rem', padding: '0 0 0.6rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {tabs.map(tab => (
                  <button key={tab.key} type="button" onClick={() => { setLbAttachTab(tab.key); setLbAttachShowAll(false) }} style={{ padding: '0.6rem 1rem', borderRadius: '0.5rem', border: `1px solid ${lbAttachTab === tab.key ? 'rgba(248,217,120,0.35)' : 'rgba(255,255,255,0.06)'}`, background: lbAttachTab === tab.key ? 'rgba(248,217,120,0.08)' : 'transparent', color: lbAttachTab === tab.key ? 'var(--gold)' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.45rem', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={tab.icon}/></svg>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content area */}
              <div style={{ maxHeight: '48vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '0.4rem 0' }}>
                {lbAttachTab === 'all' ? (
                  /* All Images — grouped by act/scene */
                  storyboard.acts.map(act => {
                    const actImages = act.scenes.flatMap(s => getSceneShots(s, 'images').flatMap(sh => sh.media.filter(m => m.type === 'image')))
                    if (actImages.length === 0) return null
                    return (
                    <details key={act.id} open>
                      <summary style={{ color: 'var(--gold)', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', padding: '0.4rem 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', userSelect: 'none' }}>
                        <span style={{ fontSize: '0.9rem', transition: 'transform 0.2s' }}>▸</span> {act.title} <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontSize: '0.85rem' }}>({actImages.length})</span>
                      </summary>
                      {act.scenes.map(scene => {
                        const shots = getSceneShots(scene, 'images')
                        const sceneImages = shots.flatMap(s => s.media.filter(m => m.type === 'image'))
                        if (sceneImages.length === 0) return null
                        return (
                          <div key={scene.id} style={{ marginBottom: '0.6rem', marginLeft: '0.5rem' }}>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '0.35rem', fontWeight: 500 }}>{scene.title}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                              {sceneImages.slice(0, 20).map((m) => (
                                <button key={m.id} type="button" disabled={lbAttachments.length >= 8 || lbAttachments.includes(m.url)} onClick={() => { if (lbAttachments.length < 8) setLbAttachments(prev => [...prev, m.url]) }} style={{ width: '100%', aspectRatio: '16/11', borderRadius: '6px', overflow: 'hidden', border: lbAttachments.includes(m.url) ? '2.5px solid var(--gold)' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', padding: 0, background: 'rgba(0,0,0,0.3)', opacity: lbAttachments.includes(m.url) ? 1 : 0.75, transition: 'all 0.15s', position: 'relative' }}>
                                  <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                  {lbAttachments.includes(m.url) && <div style={{ position: 'absolute', top: '3px', right: '3px', background: 'var(--gold)', borderRadius: '50%', width: '24px', height: '24px', display: 'grid', placeItems: 'center', color: '#000', fontSize: '0.75rem', fontWeight: 800 }}>{lbAttachments.indexOf(m.url) + 1}</div>}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </details>
                    )
                  })
                ) : (
                  /* Resource tab — actors/locations/props with preview images */
                  (() => {
                    const resources = filterResources(lbAttachTab)
                    const allResources = storyboard.resources[lbAttachTab] || []
                    const isFiltered = !lbAttachShowAll && resources.length < allResources.length
                    return (
                      <>
                        {resources.map(resource => {
                          const allMedia = [...(resource.media || []), ...(resource.sheetMedia || [])].filter(m => m.type === 'image')
                          const principal = allMedia[0]
                          const additional = allMedia.slice(1)
                          return (
                            <div key={resource.name} style={{ marginBottom: '0.8rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.6rem', padding: '0.6rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', fontWeight: 600 }}>{resource.name}</span>
                                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>{allMedia.length} img{allMedia.length !== 1 ? 's' : ''}</span>
                              </div>
                              {allMedia.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                                  {allMedia.slice(0, 9).map((m) => (
                                    <button key={m.id} type="button" disabled={lbAttachments.length >= 8 || lbAttachments.includes(m.url)} onClick={() => { if (lbAttachments.length < 8) setLbAttachments(prev => [...prev, m.url]) }} style={{ width: '100%', aspectRatio: '16/11', borderRadius: '6px', overflow: 'hidden', border: lbAttachments.includes(m.url) ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', padding: 0, background: 'rgba(0,0,0,0.3)', opacity: lbAttachments.includes(m.url) ? 1 : 0.75, transition: 'all 0.15s', position: 'relative' }}>
                                      <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                      {lbAttachments.includes(m.url) && <div style={{ position: 'absolute', top: '2px', right: '2px', background: 'var(--gold)', borderRadius: '50%', width: '16px', height: '16px', display: 'grid', placeItems: 'center', color: '#000', fontSize: '0.55rem', fontWeight: 800 }}>{lbAttachments.indexOf(m.url) + 1}</div>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {isFiltered && (
                          <button type="button" onClick={() => setLbAttachShowAll(true)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '0.5rem', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.75rem', textAlign: 'center', transition: 'all 0.2s' }}>
                            Show All {lbAttachTab === 'actors' ? 'Actors' : lbAttachTab === 'locations' ? 'Locations' : 'Props'} ({allResources.length} total)
                          </button>
                        )}
                      </>
                    )
                  })()
                )}
              </div>
              {/* Current attachments strip */}
              {/* Drag-reorderable attachment strip */}
              {lbAttachments.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.6rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {lbAttachments.map((url, i) => (
                    <div key={`att-${i}-${url.slice(-12)}`} draggable onDragStart={() => setLbDragIdx(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (lbDragIdx !== null && lbDragIdx !== i) { setLbAttachments(prev => { const next = [...prev]; const [moved] = next.splice(lbDragIdx, 1); next.splice(i, 0, moved); return next }); } setLbDragIdx(null) }} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '7px', overflow: 'hidden', border: '2.5px solid var(--gold)', cursor: 'grab', opacity: lbDragIdx === i ? 0.5 : 1, transition: 'opacity 0.15s', background: 'rgba(0,0,0,0.35)' }}>
                      {/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) ? (
                        <video src={url} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                      ) : /\.(mp3|wav|m4a|aac|ogg)(\?|$)/i.test(url) ? (
                        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--gold)', fontSize: '1.4rem', pointerEvents: 'none' }}>♪</div>
                      ) : (
                        <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} alt="" />
                      )}
                      <div style={{ position: 'absolute', top: '2px', left: '2px', background: 'rgba(0,0,0,0.85)', borderRadius: '4px', padding: '0 4px', fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700 }}>{i + 1}</div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setLbAttachments(prev => prev.filter((_, j) => j !== i)) }} style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.7)', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.8rem', borderRadius: '50%', width: '20px', height: '20px', display: 'grid', placeItems: 'center', padding: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => { setLbAttachOpen(false); setLbAttachShowAll(false) }} style={{ padding: '0.7rem 2rem', background: 'var(--gold)', border: 'none', color: '#000', borderRadius: '2rem', cursor: 'pointer', fontWeight: 700, fontSize: '1.05rem', alignSelf: 'center' }}>Done</button>
            </div>
            )
          })()}
        </div>
      )}
    </main>
  )
}

function getResourceTypeLabel(type: StoryboardResourceType) {
  if (type === 'actors') return 'Actors'
  if (type === 'locations') return 'Locations'
  if (type === 'moodboards') return 'Moodboards'
  return 'Props'
}

function LibraryIcon({ type }: { type: StoryboardResourceType }) {
  if (type === 'actors') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="20" r="10" />
        <path d="M14 54c3.4-13 11-20 18-20s14.6 7 18 20" />
      </svg>
    )
  }
  if (type === 'locations') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M16 18l12-6 20 8v28l-12 6-20-8z" />
        <path d="M28 12v34M48 20L36 28v26" />
        <circle cx="38" cy="26" r="5" />
      </svg>
    )
  }
  if (type === 'moodboards') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="10" y="10" width="20" height="14" rx="2" />
        <rect x="34" y="10" width="20" height="20" rx="2" />
        <rect x="10" y="28" width="20" height="26" rx="2" />
        <rect x="34" y="34" width="20" height="20" rx="2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M20 48h24l6-24-18-10-18 10z" />
      <path d="M24 28h16M26 38h12" />
      <circle cx="32" cy="14" r="5" />
    </svg>
  )
}

function AgentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <circle cx="18" cy="11" r="1.5" />
      <circle cx="6" cy="11" r="1.5" />
      <line x1="12" y1="8" x2="6" y2="16" />
      <line x1="12" y1="8" x2="18" y2="16" />
      <line x1="7.5" y1="11" x2="16.5" y2="11" />
      <line x1="6" y1="12.5" x2="6" y2="16" />
      <line x1="18" y1="12.5" x2="18" y2="16" />
    </svg>
  )
}

function CinematicCanvasIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 26h44v26H10z" />
      <path d="M12 12l38-6 4 14-38 7z" />
      <path d="M20 11l9 14M32 9l9 14M44 7l8 13" />
      <path d="M18 33h10M36 33h10" />
      <circle cx="23" cy="44" r="4" />
      <circle cx="43" cy="44" r="4" />
      <path d="M27 44h12" />
    </svg>
  )
}

function DoodleCanvas({ onClose, initialDataUrl }: { onClose: (dataUrl?: string) => void; initialDataUrl?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ff2a55');
  const [thickness, setThickness] = useState(1);
  const [shape, setShape] = useState<'free' | 'rect' | 'circle' | 'arrow'>('free');

  const startPos = useRef({ x: 0, y: 0 });
  const snapshot = useRef<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (initialDataUrl) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = initialDataUrl;
        }
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [initialDataUrl]);

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  const startDrawing = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const { x, y } = getPos(e);

    startPos.current = { x, y };
    snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = thickness === 6 ? 6 : 2;
    if (thickness === 6) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
    } else {
      ctx.shadowBlur = 0;
    }
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const { x, y } = getPos(e);

    if (shape !== 'free') {
      if (snapshot.current) {
        ctx.putImageData(snapshot.current, 0, 0);
      }
      ctx.beginPath();
      if (shape === 'rect') {
        ctx.rect(startPos.current.x, startPos.current.y, x - startPos.current.x, y - startPos.current.y);
      } else if (shape === 'circle') {
        const r = Math.sqrt(Math.pow(x - startPos.current.x, 2) + Math.pow(y - startPos.current.y, 2));
        ctx.arc(startPos.current.x, startPos.current.y, r, 0, 2 * Math.PI);
      } else if (shape === 'arrow') {
        const headlen = thickness === 6 ? 20 : 10;
        const dx = x - startPos.current.x;
        const dy = y - startPos.current.y;
        const angle = Math.atan2(dy, dx);
        ctx.moveTo(startPos.current.x, startPos.current.y);
        ctx.lineTo(x, y);
        ctx.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x, y);
        ctx.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
      }
      ctx.stroke();
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.closePath();
  };

  return (
    <div className="doodle-canvas-container">
      <canvas
        ref={canvasRef}
        className="doodle-canvas"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerOut={stopDrawing}
      />
      <div className="doodle-submenu glass">
        <div className="doodle-tools-group">
          <button className={`doodle-color red ${color === '#ff2a55' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setColor('#ff2a55'); }}></button>
          <button className={`doodle-color yellow ${color === '#feca57' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setColor('#feca57'); }}></button>
          <button className={`doodle-color blue ${color === '#48dbfb' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setColor('#48dbfb'); }}></button>
        </div>

        <div className="doodle-divider"></div>

        <div className="doodle-tools-group">
          <button className={`doodle-tool ${thickness === 2 ? 'is-active' : ''}`} onClick={(e) => { e.stopPropagation(); setThickness(2); }} title="Thin">
            <svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" fill="currentColor" /></svg>
          </button>
          <button className={`doodle-tool ${thickness === 6 ? 'is-active' : ''}`} onClick={(e) => { e.stopPropagation(); setThickness(6); }} title="Thick">
            <svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="currentColor" /></svg>
          </button>
        </div>

        <div className="doodle-divider"></div>

        <div className="doodle-tools-group">
          <button className={`doodle-tool ${shape === 'free' ? 'is-active' : ''}`} onClick={(e) => { e.stopPropagation(); setShape('free'); }} title="Freehand">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>
          </button>
          <button className={`doodle-tool ${shape === 'rect' ? 'is-active' : ''}`} onClick={(e) => { e.stopPropagation(); setShape('rect'); }} title="Rectangle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>
          </button>
          <button className={`doodle-tool ${shape === 'circle' ? 'is-active' : ''}`} onClick={(e) => { e.stopPropagation(); setShape('circle'); }} title="Circle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>
          </button>
          <button className={`doodle-tool ${shape === 'arrow' ? 'is-active' : ''}`} onClick={(e) => { e.stopPropagation(); setShape('arrow'); }} title="Arrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        </div>

        <div className="doodle-divider"></div>

        <div className="doodle-tools-group">
          <button className="doodle-tool discard" onClick={(e) => {
            e.stopPropagation();
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              ctx?.clearRect(0, 0, canvas.width, canvas.height);
            }
          }} title="Clear">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
          </button>
          <button className="doodle-tool confirm" onClick={(e) => { e.stopPropagation(); onClose(canvasRef.current?.toDataURL()); }} title="Save Note">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskNode({ task, onTaskChange, data, onAssignAsset, onEditTask, onSaveBlueprint }: { task: AgentTask; onTaskChange: (taskId: string, mutate: (task: AgentTask) => void) => void; data: StoryboardData; onAssignAsset?: (type: string, name: string, sceneId: string, url: string) => void; onEditTask?: (task: AgentTask) => void; onSaveBlueprint?: (task: AgentTask) => void }) {
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null)
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([])
  const [dragBox, setDragBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const galleryRef = useRef<HTMLDivElement>(null)
  const [enhanceOpen, setEnhanceOpen] = useState(false)
  const [enhancePrompt, setEnhancePrompt] = useState("Use exact @img1 image 1 but improve quality of character(s), objects and resolution. Do not change camera angle, composition, architecture or objects. The characters should remain in same poses and all objects in the same places. Camera should remain same angle exact the same as @img1 only improve quality. Style: 3d animated movie, cinematic AAA level 3d animation")
  const [enhanceModels, setEnhanceModels] = useState<Record<string, boolean>>({ 'seedream-4.5': true, 'gpt-image-2.0': false, 'gemini-3.1-flash': true })
  const [splitGridType, setSplitGridType] = useState<string>('2x2')
  const [splitDropdownOpen, setSplitDropdownOpen] = useState(false)
  const [splitProgress, setSplitProgress] = useState<{ current: number; total: number; panels: number } | null>(null)
  const [processingPassId, setProcessingPassId] = useState<string | null>(null)
  const isProcessingRef = useRef(false)
  const [batchNoteOpen, setBatchNoteOpen] = useState(false)
  const [batchNoteText, setBatchNoteText] = useState('')
  const [batchNoteAttachments, setBatchNoteAttachments] = useState<string[]>([])
  const [batchNoteEnhancing, setBatchNoteEnhancing] = useState(false)
  const noteFileInputRef = useRef<HTMLInputElement>(null)
  const [passPageIndex, setPassPageIndex] = useState(0)
  const PASS_PAGE_SIZE = 16

  // handleRunAgent — called DIRECTLY from Run Agent button click, NOT from useEffect
  const handleRunAgent = async () => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    const currentPasses = task.passes || []
    const nextPassNum = currentPasses.length + 1

    // Set status to working and remember which pass we're processing
    const activePass = task.activePassId || null
    setProcessingPassId(activePass)
    onTaskChange(task.id, (draft) => { draft.status = 'pass_working' as any })

    // 1) Collect all edits
    const splitImages = (task.generatedImages || []).filter(i => i.splitGrid)
    const improveImages = (task.generatedImages || []).filter(i => i.improve4k)
    const noteImages = (task.generatedImages || []).filter(i => i.note && !i.splitGrid && !i.improve4k)
    
    if (splitImages.length === 0 && improveImages.length === 0 && noteImages.length === 0) {
      isProcessingRef.current = false
      setProcessingPassId(null)
      return
    }
    
    let passLabel = 'Batch Edits'
    if (splitImages.length > 0 && improveImages.length === 0 && noteImages.length === 0) passLabel = 'Split Grid'
    else if (improveImages.length > 0 && splitImages.length === 0 && noteImages.length === 0) passLabel = 'AI Refine'
    else if (noteImages.length > 0 && splitImages.length === 0 && improveImages.length === 0) passLabel = 'AI Notes'

    // Create new pass immediately
    const newPass = { 
      id: `pass-${nextPassNum}`, 
      name: `Pass ${nextPassNum} — ${passLabel}`, 
      images: [],
      batchStats: { splits: splitImages.length, improves: improveImages.length, notes: noteImages.length }
    }
    const freshPasses = (currentPasses || []).map(p => {
      if (p.id === activePass) {
        return { ...p, images: (p.images || []).map((i: any) => ({ ...i, splitGrid: false, improve4k: false, splitType: undefined })) }
      }
      return p
    })
    const updatedPasses = [...freshPasses, newPass]
    
    onTaskChange(task.id, (draft) => {
      draft.status = 'pass_working' as any
      draft.passes = updatedPasses
      draft.activePassId = newPass.id
      draft.updatedAt = new Date().toISOString()
    })
    
    // Send to backend
    const payload = {
      splits: splitImages.map(i => ({ id: i.id, url: i.url, splitType: (i as any).splitType || '2x2' })),
      improves: improveImages.map(img => ({
        imageId: img.id,
        imagePath: img.path || img.url,
        prompt: img.improvePrompt || enhancePrompt,
        models: img.improveModel?.split(',') || ['seedream-4.5', 'gemini-3.1-flash']
      })),
      notes: noteImages.map(img => ({
        imageId: img.id,
        imagePath: img.path || img.url,
        note: img.note,
        doodle: img.doodle,
        attachedImages: (img as any).noteAttachedImages || []
      }))
    }
    
    fetch('/api/tasks/run-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id, activePassId: newPass.id, passes: updatedPasses, payload }),
    }).catch(() => { })
    
    setProcessingPassId(newPass.id)
    // isProcessingRef stays true — polling will reset it when done
  }

  // useEffect for polling ALL working tasks — including batch splits, improves, and general tasks
  useEffect(() => {
    if (!task.status.endsWith('_working')) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tasks/poll?id=${task.id}`)
        if (!res.ok) return
        const data = await res.json()
        if (!data.found || !data.task) return
        const fileTask = data.task

        // Check if the backend has completed (status no longer _working)
        if (fileTask.status && !fileTask.status.endsWith('_working')) {
          const activePass = fileTask.passes?.find((p: any) => p.id === fileTask.activePassId)
          onTaskChange(task.id, (draft) => {
            draft.status = fileTask.status
            // CRITICAL: Only update the active pass's images, preserve all other passes
            if (fileTask.passes && draft.passes) {
              const fileActivePass = fileTask.passes.find((p: any) => p.id === fileTask.activePassId)
              const draftActiveIdx = draft.passes.findIndex(p => p.id === fileTask.activePassId)
              if (draftActiveIdx !== -1 && fileActivePass) {
                draft.passes[draftActiveIdx] = fileActivePass
              } else if (fileActivePass) {
                draft.passes.push(fileActivePass)
              }
            } else if (fileTask.passes) {
              draft.passes = fileTask.passes
            }
            // Only show the active pass's images
            if (activePass?.images?.length) {
              draft.generatedImages = activePass.images
            }
            if (fileTask.activePassId) draft.activePassId = fileTask.activePassId
          })
          isProcessingRef.current = false
          setProcessingPassId(null)
          clearInterval(interval)
        } else if (fileTask.updatedAt !== task.updatedAt) {
          // Incremental batch updates (images arriving one by one)
          const activePass = fileTask.passes?.find((p: any) => p.id === fileTask.activePassId)
          onTaskChange(task.id, (draft) => {
            // Only update the active pass, never overwrite other passes
            if (fileTask.passes && draft.passes) {
              const fileActivePass = fileTask.passes.find((p: any) => p.id === fileTask.activePassId)
              const draftActiveIdx = draft.passes.findIndex(p => p.id === fileTask.activePassId)
              if (draftActiveIdx !== -1 && fileActivePass) {
                draft.passes[draftActiveIdx] = fileActivePass
              }
            }
            if (activePass?.images?.length) {
              draft.generatedImages = activePass.images
            }
            draft.updatedAt = fileTask.updatedAt
          })
        }
      } catch { /* continue polling */ }
    }, 2500)

    return () => clearInterval(interval)
  }, [task.status, task.id, task.updatedAt, onTaskChange])

  // Close dropdowns when clicking outside — uses BUBBLE phase (not capture)
  // so the button onClick handlers fire first
  useEffect(() => {
    if (!splitDropdownOpen && !enhanceOpen) return
    const handler = (e: globalThis.MouseEvent) => {
      const target = e.target as HTMLElement
      // Don't close if click is inside the bulk toolbar pill
      if (target.closest('.bulk-toolbar-pill')) return
      // Don't close if click is inside the enhance dropdown
      if (target.closest('.enhance-quality-dropdown')) return
      setSplitDropdownOpen(false)
      setEnhanceOpen(false)
    }
    // Use setTimeout to register AFTER the current click event completes
    const timer = setTimeout(() => {
      document.addEventListener('click', handler)
    }, 0)
    return () => { clearTimeout(timer); document.removeEventListener('click', handler) }
  }, [splitDropdownOpen, enhanceOpen])

  // Rubber band drag selection handlers — drag auto-activates batch selection
  const handleGalleryMouseDown = (e: React.MouseEvent) => {
    if (!galleryRef.current) return
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.expanded-tools') || (e.target as HTMLElement).closest('.floating-note-area') || (e.target as HTMLElement).closest('.assign-menu-glass')) return
    const rect = galleryRef.current.getBoundingClientRect()
    const scrollTop = galleryRef.current.scrollTop || 0
    setDragBox({ startX: e.clientX - rect.left, startY: e.clientY - rect.top + scrollTop, endX: e.clientX - rect.left, endY: e.clientY - rect.top + scrollTop })
    setIsDragging(true)
    e.preventDefault()
  }
  const handleGalleryMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragBox || !galleryRef.current) return
    const rect = galleryRef.current.getBoundingClientRect()
    const scrollTop = galleryRef.current.scrollTop || 0
    setDragBox(prev => prev ? { ...prev, endX: e.clientX - rect.left, endY: e.clientY - rect.top + scrollTop } : null)
  }
  const handleGalleryMouseUp = () => {
    if (!isDragging || !dragBox || !galleryRef.current) { setIsDragging(false); setDragBox(null); return }
    const items = galleryRef.current.querySelectorAll('.gallery-item')
    const containerRect = galleryRef.current.getBoundingClientRect()
    const boxLeft = Math.min(dragBox.startX, dragBox.endX)
    const boxRight = Math.max(dragBox.startX, dragBox.endX)
    const boxTop = Math.min(dragBox.startY, dragBox.endY)
    const boxBottom = Math.max(dragBox.startY, dragBox.endY)
    // Only proceed if drag was more than 30px (avoid confusion with tap/scroll)
    if (Math.abs(dragBox.endX - dragBox.startX) > 30 && Math.abs(dragBox.endY - dragBox.startY) > 30) {
      const intersectingIds: string[] = []
      items.forEach(item => {
        const r = item.getBoundingClientRect()
        const scrollTop = galleryRef.current!.scrollTop || 0
        const itemLeft = r.left - containerRect.left
        const itemTop = r.top - containerRect.top + scrollTop
        const itemRight = itemLeft + r.width
        const itemBottom = itemTop + r.height
        if (itemLeft < boxRight && itemRight > boxLeft && itemTop < boxBottom && itemBottom > boxTop) {
          const key = item.getAttribute('data-img-id')
          if (key) intersectingIds.push(key)
        }
      })
      if (intersectingIds.length > 0) {
        // Auto-activate batch selection if not already active
        if (!multiSelectMode) setMultiSelectMode(true)
        setSelectedImageIds(prev => {
          const newSet = new Set(prev)
          intersectingIds.forEach(id => newSet.add(id))
          return Array.from(newSet)
        })
      }
    } else if (Math.abs(dragBox.endX - dragBox.startX) < 5 && Math.abs(dragBox.endY - dragBox.startY) < 5) {
      // Tiny drag = click on empty area — deselect all
      if (multiSelectMode) {
        setMultiSelectMode(false)
        setSelectedImageIds([])
      }
    }
    setIsDragging(false)
    setDragBox(null)
  }

  const [assignMenu, setAssignMenu] = useState<'scene' | 'actor' | 'prop' | 'location' | 'style' | 'image' | null>(null)
  const [assignName, setAssignName] = useState('')
  const [assignSceneId, setAssignSceneId] = useState('')
  const [dcAssignTab, setDcAssignTab] = useState<'image' | 'actor' | 'scene' | 'props'>('image')
  const [dcAssignNewName, setDcAssignNewName] = useState('')
  const [dcAssignExpandAct, setDcAssignExpandAct] = useState<string | null>(null)
  const [dcSkillOpen, setDcSkillOpen] = useState(false)
  const [dcAvailableSkills, setDcAvailableSkills] = useState<any[]>([])
  const [dcAttachedSkills, setDcAttachedSkills] = useState<{ id: string; name: string }[]>([])
  const [dcSkillsPage, setDcSkillsPage] = useState(0)
  const [dcNoteAttachments, setDcNoteAttachments] = useState<string[]>([])
  const [dcNoteAiEnhancing, setDcNoteAiEnhancing] = useState(false)
  const [dcNoteAttachOpen, setDcNoteAttachOpen] = useState(false)
  const [dcNoteAttachTab, setDcNoteAttachTab] = useState<'all' | 'actors' | 'locations' | 'props'>('all')
  const [dcNoteAttachShowAll, setDcNoteAttachShowAll] = useState(false)
  const [dcNoteModelOpen, setDcNoteModelOpen] = useState(false)
  const [dcNoteSelectedModels, setDcNoteSelectedModels] = useState<Record<string, boolean>>({ 'gemini-3.1-flash': true, 'seedream-4.5': false })
  const [dcNoteBatchSize, setDcNoteBatchSize] = useState(1)
  const [dcNoteAspectRatio, setDcNoteAspectRatio] = useState('16:9')
  const dcNoteFileRef = useRef<HTMLInputElement>(null)

  // selectedCount removed

  if (task.status === 'archived') {
    return (
      <article className="agent-task-card glass archived" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', minHeight: '200px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <input value={task.title} onChange={(event) => onTaskChange(task.id, (draftTask) => { draftTask.title = event.target.value })} style={{ background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: '1.25rem', outline: 'none', fontWeight: '600', width: '100%', fontFamily: '"Outfit", sans-serif' }} />
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', whiteSpace: 'nowrap', paddingTop: '0.3rem' }}>{new Date(task.updatedAt).toLocaleDateString()}</div>
        </div>

        {task.generatedImages && task.generatedImages.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', overflow: 'hidden', flex: 1, alignItems: 'flex-start' }}>
            {task.generatedImages.slice(0, 3).map(img => (
              <img key={img.id} src={img.url} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} alt="" />
            ))}
          </div>
        )}

        <div className="task-actions-text" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto' }}>
          {onSaveBlueprint && (
            <button type="button" title="Make Blueprint" onClick={() => onSaveBlueprint(task)} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(248, 217, 120, 0.6)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            </button>
          )}
          <button type="button" title="Reopen (Send back to Queue)" onClick={() => { onTaskChange(task.id, draft => { draft.status = 'todo' }); fetch('/api/tasks/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, status: 'todo', updatedAt: new Date().toISOString() }) }).catch(() => { }); }} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(64,255,156,0.7)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
          </button>
          <button type="button" title="Edit (Send to Edit)" onClick={() => { onTaskChange(task.id, draft => { draft.status = 'pass' as any }); fetch('/api/tasks/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, status: 'pass', updatedAt: new Date().toISOString() }) }).catch(() => { }); }} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button type="button" title="Delete permanently" onClick={() => { if (confirm('Permanently delete this task?')) { onTaskChange(task.id, draft => { draft.status = 'deleted' as any }); fetch('/api/tasks/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id }) }).catch(() => { }); } }} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,42,85,0.7)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </article>
    );
  }

  if (task.status === 'todo' || task.status === 'todo_working') {
    return (
      <article className="agent-task-card glass todo" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <input value={task.title} onChange={(event) => onTaskChange(task.id, (draftTask) => { draftTask.title = event.target.value })} style={{ background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: '1.25rem', outline: 'none', fontWeight: '600', width: '100%', fontFamily: '"Outfit", sans-serif' }} />
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', whiteSpace: 'nowrap', paddingTop: '0.3rem' }}>{new Date(task.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>

        <textarea value={task.prompt} onChange={(e) => onTaskChange(task.id, (draft) => { draft.prompt = e.target.value })} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: '1.5', flex: 1, overflowY: 'auto', wordBreak: 'break-word', whiteSpace: 'pre-wrap', marginBottom: '0.5rem', paddingRight: '0.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.6rem', resize: 'vertical', minHeight: '60px', fontFamily: 'inherit', outline: 'none', width: '100%' }} placeholder="Write prompt..." />

        <div className="task-attachment-preview" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {task.sceneHint && (
            <div className="preview-icon-chip" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              {task.sceneHint}
            </div>
          )}
          {task.skillHint && (
            <div className="preview-icon-chip" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              {task.skillHint}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button type="button" onClick={() => {
            if (dcAvailableSkills.length === 0) {
              fetch('/api/storyboard/skills').then(r => r.json()).then(d => { if (d.skills) setDcAvailableSkills(d.skills) }).catch(() => {})
            }
            setDcSkillOpen(true)
          }} style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8"/></svg>
            Skills & Prompts
          </button>
        </div>
        {dcSkillOpen && <LbSkillStoreModal lbAvailableSkills={dcAvailableSkills} lbAttachedSkills={dcAttachedSkills} setLbAttachedSkills={setDcAttachedSkills} setLbSkillOpen={setDcSkillOpen} setLbAvailableSkills={setDcAvailableSkills} lbSkillsPage={dcSkillsPage} setLbSkillsPage={setDcSkillsPage} onInjectPrompt={(text: string) => { onTaskChange(task.id, draft => { draft.prompt = text }); setDcSkillOpen(false) }} />}

        <div className="task-actions-text" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: 'auto' }}>
          <button type="button" onClick={async () => {
            onTaskChange(task.id, draft => { draft.status = 'todo_working' as any })

            // 1. CRITICAL: Create the task file on disk FIRST (update won't work if file doesn't exist)
            try {
              await fetch('/api/tasks/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...task, status: 'todo_working', updatedAt: new Date().toISOString() }),
              })
            } catch { /* fallback: try update in case file already exists */ 
              fetch('/api/tasks/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: task.id, status: 'todo_working', updatedAt: new Date().toISOString() }),
              }).catch(() => { })
            }

            // 2. Trigger the automated execution based on dynamic skill parsing
            const skillLower = (task.skillHint || '').toLowerCase();
            const promptLower = (task.prompt || '').toLowerCase();

            if (skillLower.includes('download') || promptLower.includes('download the pixverse images')) {
              fetch('/api/tasks/download-pixverse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId: task.id, prompt: task.prompt })
              }).catch(() => { })
            } else if (skillLower.includes('improve') || skillLower.includes('enhance')) {
              fetch('/api/tasks/generate-pixverse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  taskId: task.id,
                  prompt: task.prompt,
                  sceneHint: task.sceneHint,
                  skillHint: task.skillHint,
                  model: 'gemini-3.1-flash',
                  quality: '2160p',
                  aspectRatio: '16:9'
                })
              }).catch(() => { })
            } else if (skillLower.includes('split')) {
              fetch('/api/tasks/generate-pixverse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  taskId: task.id,
                  prompt: task.prompt,
                  sceneHint: task.sceneHint,
                  skillHint: task.skillHint,
                  model: 'gemini-3.1-flash',
                  quality: '2160p',
                  aspectRatio: '16:9'
                })
              }).catch(() => { })
            } else {
              // Default to generation
              fetch('/api/tasks/generate-pixverse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  taskId: task.id,
                  prompt: task.prompt,
                  sceneHint: task.sceneHint,
                  skillHint: task.skillHint,
                  model: 'gemini-3.1-flash',
                  quality: '2160p',
                  aspectRatio: '16:9'
                })
              }).catch(() => { })
            }
          }} style={{ fontSize: '0.9rem', padding: '0.8rem 1.5rem', background: 'rgba(248, 217, 120, 0.1)', color: 'var(--gold)', border: '1px solid rgba(248, 217, 120, 0.3)', borderRadius: '2rem', fontWeight: 600, flex: 1, display: 'flex', justifyContent: 'center', transition: 'all 0.2s' }}>Start Task</button>

          <button type="button" title="Make Blueprint" onClick={() => onSaveBlueprint?.(task)} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} className="queue-action-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </button>

          <button type="button" title="Edit in Composer" onClick={() => onEditTask?.(task)} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} className="queue-action-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>

          <button type="button" title="Duplicate Task" onClick={() => {
            const newTask = { ...task, id: `task-dup-${Date.now()}-${Math.random().toString(36).substr(2,6)}`, title: task.title + ' (copy)', status: 'todo' as any, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), passes: [], generatedImages: [] };
            onTaskChange(newTask.id, () => newTask);
            fetch('/api/tasks/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTask) }).catch(() => {});
          }} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} className="queue-action-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>

          <button type="button" title="Delete" onClick={() => { onTaskChange(task.id, draft => { draft.status = 'archived' }); fetch('/api/tasks/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id }) }).catch(() => { }); }} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,42,85,0.7)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} className="queue-action-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>

        {task.status === 'todo_working' && (
          <div className="processing-overlay glass" style={{ borderRadius: '1rem', background: 'rgba(0,0,0,0.85)' }}>
            <button className="stop-btn" title="Stop Task" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--gold)', padding: '0.5rem', cursor: 'pointer', zIndex: 10 }} onClick={(e) => { e.stopPropagation(); onTaskChange(task.id, draft => { draft.status = 'todo' }); }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            </button>
            <div className="processing-stats" style={{ textAlign: 'center' }}>
              <h3 className="processing-title" style={{ fontSize: '1.1rem', color: 'var(--gold)' }}>Generating Assets...</h3>
              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden', marginTop: '1rem' }}>
                <div style={{ width: '30%', height: '100%', background: 'linear-gradient(90deg, var(--gold), #f8c040)', borderRadius: '2px', animation: 'progressPulse 2s ease-in-out infinite' }} />
              </div>
            </div>
          </div>
        )}
      </article>
    );
  }

  return (
    <article className={`agent-task-card glass ${task.status} ${task.generatedImages?.length ? 'has-media' : 'text-only'}`}>
      <div className="agent-task-top">
        <input value={task.title} onChange={(event) => onTaskChange(task.id, (draftTask) => { draftTask.title = event.target.value })} style={{ background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: '1.25rem', outline: 'none', fontWeight: '600', width: '100%', fontFamily: '"Outfit", sans-serif', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }} />
      </div>

      {task.status.startsWith('pass') && task.passes && task.passes.length > 0 && (
        <div className="task-passes-subtabs" style={{ display: 'flex', gap: '0.5rem', padding: '1rem 1rem 0 1rem', position: 'relative', zIndex: 1 }}>
          {task.passes.map(p => (
            <div key={p.id} style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
              <button className={`pass-tab ${task.activePassId === p.id ? 'is-active' : ''}`} onClick={() => {
                setMultiSelectMode(false)
                setSelectedImageIds([])
                setSplitDropdownOpen(false)
                setEnhanceOpen(false)
                setExpandedImageId(null)
                setPassPageIndex(0)
                onTaskChange(task.id, draft => { draft.activePassId = p.id; draft.generatedImages = draft.passes?.find(x => x.id === p.id)?.images || [] })
              }} onDoubleClick={(e) => { e.stopPropagation(); const newName = prompt('Rename pass:', p.name); if (newName && newName.trim()) { onTaskChange(task.id, draft => { const dp = draft.passes?.find(x => x.id === p.id); if (dp) dp.name = newName.trim() }) } }} style={{ padding: '0.6rem 1.2rem', paddingRight: task.passes!.length > 1 ? '2rem' : '1.2rem', borderRadius: '8px 8px 0 0', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', color: task.activePassId === p.id ? 'var(--gold)' : 'rgba(255,255,255,0.6)', background: task.activePassId === p.id ? 'rgba(248, 217, 120, 0.05)' : 'rgba(0,0,0,0.2)', cursor: 'pointer', fontSize: '0.85rem', position: 'relative', top: '1px', zIndex: task.activePassId === p.id ? 2 : 1 }}>
                {p.name}
              </button>
              {task.passes!.length > 1 && (
                <button type="button" title="Delete Pass" className="pass-tab-close" onClick={(e) => {
                  e.stopPropagation();
                  const remaining = task.passes!.filter(x => x.id !== p.id);
                  if (remaining.length === 0) {
                    onTaskChange(task.id, draft => { draft.status = 'archived'; draft.passes = []; draft.generatedImages = []; });
                  } else {
                    const newActive = task.activePassId === p.id ? remaining[remaining.length - 1] : remaining.find(x => x.id === task.activePassId) || remaining[remaining.length - 1];
                    onTaskChange(task.id, draft => { draft.passes = remaining; draft.activePassId = newActive.id; draft.generatedImages = newActive.images || []; });
                  }
                  fetch('/api/tasks/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id }) }).catch(() => {});
                }} style={{ position: 'absolute', top: '4px', right: '4px', width: '16px', height: '16px', borderRadius: '50%', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '0.6rem', zIndex: 10, opacity: 0, transition: 'all 0.2s', padding: 0 }}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {processingPassId && task.activePassId === processingPassId ? (
        <div className="generated-gallery-wrapper" style={{ minHeight: '400px', position: 'relative' }}>
          {/* Processing overlay — over EMPTY area, no images shown */}
          {(() => {
            const pass = task.passes?.find(p => p.id === processingPassId)
            const stats = (pass as any)?.batchStats || { splits: 0, improves: 0, notes: 0 }
            const splitCount = stats.splits
            const enhanceCount = stats.improves
            const notesCount = stats.notes
            const activeCount = splitCount + enhanceCount + notesCount
            const activeTask = splitCount > 0 ? 'Splitting grids' : enhanceCount > 0 ? 'Enhancing quality' : notesCount > 0 ? 'Refining Prompts' : 'Processing batch'
            const estTime = (splitCount * 5) + (enhanceCount * 30) + (notesCount * 15)
            return (
              <div className="processing-overlay glass">
                <button className="stop-btn" title="Stop Generation" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--gold)', padding: '0.5rem', cursor: 'pointer', zIndex: 10 }} onClick={(e) => { e.stopPropagation(); isProcessingRef.current = false; setProcessingPassId(null); onTaskChange(task.id, draft => { draft.status = draft.status.replace('_working', '') as any; }); }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </button>
                <div className="processing-stats">
                  <h3 className="processing-title">{activeTask}...</h3>
                  <div className="stats-row">
                    {splitCount > 0 && <div className="stat-item"><span className="stat-num">{splitCount}</span> Split Grid</div>}
                    {enhanceCount > 0 && <div className="stat-item"><span className="stat-num">{enhanceCount}</span> Enhance</div>}
                    {notesCount > 0 && <div className="stat-item"><span className="stat-num">{notesCount}</span> AI Notes</div>}
                  </div>
                  <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                      {splitProgress ? `${splitProgress.current}/${splitProgress.total} processed • ${splitProgress.panels} panels created` : `${activeCount} operations queued${estTime > 0 ? ` • ~${estTime < 60 ? estTime + 's' : Math.round(estTime / 60) + 'min'} estimated` : ''}`}
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginTop: '0.3rem' }}>
                      <div style={{ width: splitProgress ? `${Math.round((splitProgress.current / splitProgress.total) * 100)}%` : '30%', height: '100%', background: 'linear-gradient(90deg, var(--gold), #f8c040)', borderRadius: '3px', transition: 'width 0.5s ease', animation: splitProgress ? 'none' : 'progressPulse 2s ease-in-out infinite' }} />
                    </div>
                  </div>

                </div>
              </div>
            )
          })()}
        </div>
      ) : (!task.generatedImages || task.generatedImages.length === 0) ? (
        <textarea className="task-huge-textarea" placeholder="Write task instructions..." value={task.prompt} onChange={(event) => onTaskChange(task.id, (draftTask) => { draftTask.prompt = event.target.value })} />
      ) : (
        <div className="generated-gallery-wrapper">
          {/* Multi-select toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <button type="button" onClick={() => {
              if (multiSelectMode) {
                // Exiting select mode → clear all marks so images go back to clean state
                onTaskChange(task.id, draft => {
                  draft.generatedImages?.forEach(i => { i.splitGrid = false; i.improve4k = false; (i as any).splitType = undefined })
                })
                setSelectedImageIds([])
                setSplitDropdownOpen(false)
                setEnhanceOpen(false)
              }
              setMultiSelectMode(!multiSelectMode)
            }} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: multiSelectMode ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.15)', background: multiSelectMode ? 'rgba(248, 217, 120, 0.1)' : 'transparent', color: multiSelectMode ? 'var(--gold)' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M9 12l2 2 4-4"></path></svg>
              {multiSelectMode ? 'Cancel Select' : 'Select'}
            </button>
            {multiSelectMode && (
              <>
                <button type="button" onClick={() => {
                  const allIds = (task.generatedImages || []).filter(i => !i.assignedType).map(i => i.id)
                  setSelectedImageIds(prev => prev.length === allIds.length ? [] : allIds)
                }} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }}>
                  {selectedImageIds.length === (task.generatedImages || []).filter(i => !i.assignedType).length ? 'Deselect All' : 'Select All'}
                </button>
                <span style={{ color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 600 }}>
                  {selectedImageIds.length} selected
                </span>
              </>
            )}
          </div>

          {/* Bulk action floating toolbar */}
          {multiSelectMode && selectedImageIds.length > 0 && (
            <div style={{ position: 'sticky', top: '0', zIndex: 50, display: 'flex', justifyContent: 'center', padding: '0.8rem 0' }}>
              <div className="bulk-toolbar-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', background: 'rgba(10, 15, 25, 0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(248, 217, 120, 0.25)', borderRadius: '2rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <span style={{ color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 600, marginRight: '0.5rem' }}>{selectedImageIds.length} ✦</span>
                {splitDropdownOpen ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', animation: 'fadeIn 0.2s ease-out' }}>
                    <span style={{ color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 600, marginRight: '0.4rem', whiteSpace: 'nowrap' }}>Split into:</span>
                    {['2x2', '3x2', '3x3'].map(grid => (
                      <button key={grid} type="button" onClick={() => {
                        onTaskChange(task.id, draft => {
                          if (draft.passes) {
                            const pIdx = draft.passes.findIndex(p => p.id === draft.activePassId);
                            if (pIdx !== -1 && draft.passes[pIdx].images) {
                              draft.passes[pIdx].images = draft.passes[pIdx].images.map(i =>
                                selectedImageIds.includes(i.id) ? { ...i, splitGrid: true, splitType: grid } as any : i
                              );
                            }
                          }
                          if (draft.generatedImages) {
                            draft.generatedImages = draft.generatedImages.map(i =>
                              selectedImageIds.includes(i.id) ? { ...i, splitGrid: true, splitType: grid } as any : i
                            );
                          }
                        });
                        setSplitDropdownOpen(false);
                      }} style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'rgba(248, 217, 120, 0.12)', border: '1px solid rgba(248, 217, 120, 0.4)', color: 'var(--gold)', borderRadius: '0.6rem', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248, 217, 120, 0.2)'; e.currentTarget.style.borderColor = 'var(--gold)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248, 217, 120, 0.12)'; e.currentTarget.style.borderColor = 'rgba(248, 217, 120, 0.4)'; }}>
                        {grid}
                      </button>
                    ))}
                    <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.2)', margin: '0 0.5rem' }}></div>
                    <button type="button" onClick={() => setSplitDropdownOpen(false)} style={{ padding: '0.5rem 0.8rem', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <button type="button" title="Split Grid" onClick={() => {
                      const anyMarked = (task.generatedImages || []).some(i => selectedImageIds.includes(i.id) && i.splitGrid)
                      if (anyMarked) {
                        onTaskChange(task.id, draft => {
                          if (draft.passes) {
                            const pIdx = draft.passes.findIndex(p => p.id === draft.activePassId);
                            if (pIdx !== -1 && draft.passes[pIdx].images) {
                              draft.passes[pIdx].images = draft.passes[pIdx].images.map(i =>
                                selectedImageIds.includes(i.id) ? { ...i, splitGrid: false, splitType: undefined } as any : i
                              );
                            }
                          }
                          if (draft.generatedImages) {
                            draft.generatedImages = draft.generatedImages.map(i =>
                              selectedImageIds.includes(i.id) ? { ...i, splitGrid: false, splitType: undefined } as any : i
                            );
                          }
                        })
                      } else {
                        setSplitDropdownOpen(true)
                      }
                    }} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', display: 'grid', placeItems: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line><line x1="3" y1="12" x2="21" y2="12"></line></svg>
                    </button>

                    <button type="button" title="Enhance Quality" onClick={() => setEnhanceOpen(!enhanceOpen)} style={{ padding: '0.5rem', background: enhanceOpen ? 'rgba(248, 217, 120, 0.15)' : 'transparent', color: enhanceOpen ? 'var(--gold)' : 'rgba(255,255,255,0.7)', border: enhanceOpen ? '1px solid rgba(248, 217, 120, 0.3)' : 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', display: 'grid', placeItems: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"></path></svg>
                    </button>

                    <button type="button" title="Add Note to All" onClick={() => {
                      setBatchNoteText('')
                      setBatchNoteOpen(true)
                    }} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'grid', placeItems: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>

                    <button type="button" title="Download Selected" onClick={async () => {
                      const selected = (task.generatedImages || []).filter(i => selectedImageIds.includes(i.id))
                      if (selected.length === 0) return
                      try {
                        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
                        for (let i = 0; i < selected.length; i++) {
                          const img = selected[i]
                          try {
                            const response = await fetch(img.url)
                            if (!response.ok) continue
                            const blob = await response.blob()
                            const baseName = img.url.split('/').pop() || `image.png`
                            const taskSlug = (task.title || 'task').replace(/[^a-z0-9]+/gi, '-').substring(0, 30)
                            const fileName = `${taskSlug}_${String(i + 1).padStart(3, '0')}_${baseName}`
                            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
                            const writable = await fileHandle.createWritable()
                            await writable.write(blob)
                            await writable.close()
                          } catch { /* skip */ }
                        }
                      } catch { /* user cancelled */ }
                    }} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'grid', placeItems: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>

                    <button type="button" title="Assign to Scene" onClick={() => {
                      onTaskChange(task.id, draft => {
                        if (draft.passes) {
                          const pIdx = draft.passes.findIndex(p => p.id === draft.activePassId);
                          if (pIdx !== -1 && draft.passes[pIdx].images) {
                            draft.passes[pIdx].images = draft.passes[pIdx].images.map(i =>
                              selectedImageIds.includes(i.id) ? { ...i, assignMenuOpen: true } : i
                            );
                          }
                        }
                        if (draft.generatedImages) {
                          draft.generatedImages = draft.generatedImages.map(i =>
                            selectedImageIds.includes(i.id) ? { ...i, assignMenuOpen: true } : i
                          );
                        }
                      })
                    }} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'grid', placeItems: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    </button>

                    <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)', margin: '0 0.3rem' }}></div>

                    <button type="button" title="Reset Edits" onClick={() => {
                      onTaskChange(task.id, draft => {
                        if (draft.passes) {
                          const pIdx = draft.passes.findIndex(p => p.id === draft.activePassId);
                          if (pIdx !== -1 && draft.passes[pIdx].images) {
                            draft.passes[pIdx].images = draft.passes[pIdx].images.map(i =>
                              selectedImageIds.includes(i.id) ? { ...i, splitGrid: false, improve4k: false, note: '', splitType: undefined } as any : i
                            );
                          }
                        }
                        if (draft.generatedImages) {
                          draft.generatedImages = draft.generatedImages.map(i =>
                            selectedImageIds.includes(i.id) ? { ...i, splitGrid: false, improve4k: false, note: '', splitType: undefined } as any : i
                          );
                        }
                      })
                    }} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'grid', placeItems: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                    </button>

                    <button type="button" title="Delete Selected" onClick={() => {
                      if (confirm(`Delete ${selectedImageIds.length} selected images?`)) {
                        onTaskChange(task.id, draft => {
                          const pass = draft.passes?.find(p => p.id === draft.activePassId);
                          if (pass && pass.images) pass.images = pass.images.filter(i => !selectedImageIds.includes(i.id));
                          draft.generatedImages = draft.generatedImages?.filter(i => !selectedImageIds.includes(i.id));
                        })
                        setSelectedImageIds([])
                      }
                    }} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,42,85,0.8)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'grid', placeItems: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}



          {/* Enhance Quality Skill Dropdown */}
          {enhanceOpen && multiSelectMode && selectedImageIds.length > 0 && (
            <div className="enhance-quality-dropdown" style={{ margin: '0 1rem 0.8rem', padding: '1.2rem', background: 'rgba(10, 15, 25, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(248, 217, 120, 0.2)', borderRadius: '1rem', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span style={{ color: 'var(--gold)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"></path></svg>
                  Enhance Quality Skill
                </span>
                <button type="button" onClick={() => setEnhanceOpen(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
              </div>
              <textarea value={enhancePrompt} onChange={e => setEnhancePrompt(e.target.value)} style={{ width: '100%', minHeight: '80px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.7rem', color: 'white', fontSize: '0.8rem', lineHeight: '1.4', resize: 'vertical', fontFamily: 'inherit' }} />
              <div style={{ marginTop: '0.8rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Models (select multiple)</span>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                  {[
                    { key: 'seedream-4.5', label: 'Seedream 4.5 — 4K', q: '2160p' },
                    { key: 'gpt-image-2.0', label: 'GPT-2 — 2K', q: '1440p' },
                    { key: 'gemini-3.1-flash', label: 'Gemini 3.1 Flash — 4K', q: '2160p' },
                    { key: 'gemini-3.0', label: 'Gemini 3.0 — 2K', q: '1440p' },
                    { key: 'kling-image-v3', label: 'Kling V3 — 4K', q: '2160p' },
                  ].map(m => (
                    <button key={m.key} type="button" onClick={() => setEnhanceModels(prev => ({ ...prev, [m.key]: !prev[m.key] }))} style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', border: enhanceModels[m.key] ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.1)', background: enhanceModels[m.key] ? 'rgba(248, 217, 120, 0.1)' : 'transparent', color: enhanceModels[m.key] ? 'var(--gold)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: enhanceModels[m.key] ? 600 : 400, transition: 'all 0.2s' }}>
                      {enhanceModels[m.key] ? '✓ ' : ''}{m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.8rem' }}>
                <button type="button" onClick={() => {
                  onTaskChange(task.id, draft => {
                    const improveModelStr = Object.entries(enhanceModels).filter(([, v]) => v).map(([k]) => k).join(',');
                    if (draft.passes) {
                      const pIdx = draft.passes.findIndex(p => p.id === draft.activePassId);
                      if (pIdx !== -1 && draft.passes[pIdx].images) {
                        draft.passes[pIdx].images = draft.passes[pIdx].images.map(i =>
                          selectedImageIds.includes(i.id) ? { ...i, improve4k: true, improvePrompt: enhancePrompt, improveModel: improveModelStr } : i
                        );
                      }
                    }
                    if (draft.generatedImages) {
                      draft.generatedImages = draft.generatedImages.map(i =>
                        selectedImageIds.includes(i.id) ? { ...i, improve4k: true, improvePrompt: enhancePrompt, improveModel: improveModelStr } : i
                      );
                    }
                  })
                  setEnhanceOpen(false)
                }} style={{ padding: '0.6rem 1.5rem', background: 'var(--gold)', color: '#000', border: 'none', borderRadius: '2rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                  Apply to {selectedImageIds.length} images
                </button>
              </div>
            </div>
          )}

          {/* Carousel pagination — dots + arrows for >16 images */}
          {(() => {
            const allImages = task.generatedImages.filter(img => !img.assignedType)
            const totalPages = Math.ceil(allImages.length / PASS_PAGE_SIZE)
            const safePageIdx = Math.min(passPageIndex, totalPages - 1)
            if (totalPages <= 1) return null
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.5rem 0 0.3rem', position: 'relative' }}>
                <button type="button" disabled={safePageIdx === 0} onClick={() => setPassPageIndex(Math.max(0, safePageIdx - 1))} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '32px', height: '32px', display: 'grid', placeItems: 'center', cursor: safePageIdx === 0 ? 'default' : 'pointer', opacity: safePageIdx === 0 ? 0.2 : 0.6, transition: 'all 0.2s', color: 'white', padding: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={`page-dot-${i}`} type="button" onClick={() => setPassPageIndex(i)} style={{ width: i === safePageIdx ? '24px' : '8px', height: '8px', borderRadius: '4px', border: 'none', background: i === safePageIdx ? 'var(--gold)' : 'rgba(255,255,255,0.2)', boxShadow: i === safePageIdx ? '0 0 8px rgba(248,217,120,0.5)' : 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s ease' }} />
                ))}
                <button type="button" disabled={safePageIdx >= totalPages - 1} onClick={() => setPassPageIndex(Math.min(totalPages - 1, safePageIdx + 1))} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '32px', height: '32px', display: 'grid', placeItems: 'center', cursor: safePageIdx >= totalPages - 1 ? 'default' : 'pointer', opacity: safePageIdx >= totalPages - 1 ? 0.2 : 0.6, transition: 'all 0.2s', color: 'white', padding: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: 500, marginLeft: '0.4rem' }}>{safePageIdx + 1}/{totalPages} ({allImages.length} images)</span>
              </div>
            )
          })()}

          <div className="generated-gallery" ref={galleryRef} style={{ position: 'relative', userSelect: multiSelectMode ? 'none' : 'auto' }} onMouseDown={handleGalleryMouseDown} onMouseMove={handleGalleryMouseMove} onMouseUp={handleGalleryMouseUp} onMouseLeave={handleGalleryMouseUp}>
            {/* Rubber band drag overlay */}
            {isDragging && dragBox && (
              <div style={{ position: 'absolute', left: Math.min(dragBox.startX, dragBox.endX), top: Math.min(dragBox.startY, dragBox.endY), width: Math.abs(dragBox.endX - dragBox.startX), height: Math.abs(dragBox.endY - dragBox.startY), background: 'rgba(248, 217, 120, 0.08)', border: '2px solid rgba(248, 217, 120, 0.4)', borderRadius: '4px', pointerEvents: 'none', zIndex: 100 }} />
            )}
            {(() => {
              const allImages = task.generatedImages.filter(img => !img.assignedType)
              const totalPages = Math.ceil(allImages.length / PASS_PAGE_SIZE)
              const safePageIdx = Math.min(passPageIndex, totalPages - 1)
              const pageImages = totalPages > 1 ? allImages.slice(safePageIdx * PASS_PAGE_SIZE, (safePageIdx + 1) * PASS_PAGE_SIZE) : allImages
              return pageImages.map((img) => {
              const isAssigned = !!img.assignedType;
              const isMultiSelected = multiSelectMode && selectedImageIds.includes(img.id);
              return (
                <div
                  key={img.id}
                  data-img-id={img.id}
                  className={`gallery-item ${expandedImageId === img.id ? 'is-expanded' : ''} ${img.selected ? 'is-selected' : ''} ${isAssigned ? 'is-assigned' : ''} ${isMultiSelected ? 'is-multi-selected' : ''}`}
                  style={isMultiSelected ? { outline: '3px solid var(--gold)', outlineOffset: '-3px', boxShadow: '0 0 16px rgba(248, 217, 120, 0.4)' } : undefined}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.expanded-tools') || (e.target as HTMLElement).closest('.assign-menu-glass') || (e.target as HTMLElement).closest('.doodle-canvas-container')) return;
                    if (multiSelectMode) {
                      setSelectedImageIds(prev => prev.includes(img.id) ? prev.filter(id => id !== img.id) : [...prev, img.id])
                      return
                    }
                    setExpandedImageId(expandedImageId === img.id ? null : img.id)
                  }}
                >
                  {isMultiSelected && <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', zIndex: 5, width: '26px', height: '26px', borderRadius: '50%', background: 'var(--gold)', display: 'grid', placeItems: 'center', fontSize: '0.75rem', fontWeight: 900, color: '#000', fontFamily: '"Outfit", sans-serif' }}>{selectedImageIds.indexOf(img.id) + 1}</div>}
                  <img src={img.url} alt="Generated Draft" loading="lazy" decoding="async" />
                  {img.doodleDataUrl && !img.doodleActive && <img src={img.doodleDataUrl} className="doodle-overlay-static" alt="Doodle Overlay" />}

                  <div className="thumbnail-badges">
                    {img.improve4k && <span className="badge improve"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" /></svg></span>}
                    {img.splitGrid && <span className="badge split"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" /></svg></span>}
                    {img.note && <span className="badge note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></span>}
                    {img.doodleDataUrl && <span className="badge doodle" style={{ color: '#ff2a55' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg></span>}
                  </div>

                  <button type="button" className="img-download-btn" onClick={(e) => { e.stopPropagation(); const a = document.createElement('a'); a.href = img.url; a.download = img.url.split('/').pop() || 'image.png'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }} style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', width: '1.6rem', height: '1.6rem', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', display: 'grid', placeItems: 'center', cursor: 'pointer', zIndex: 5, transition: 'all 0.2s', opacity: 0 }} title="Download">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  </button>

                  {expandedImageId === img.id && (
                    <div className="expanded-tools" onClick={(e) => e.stopPropagation()}>
                      <div className="floating-tools left vertical">
                        <button className={`tool-icon action-doodle ${img.doodleActive ? 'is-active' : ''}`} disabled={isAssigned} onClick={() => onTaskChange(task.id, (draft) => { const i = draft.generatedImages?.find(x => x.id === img.id); if (i) i.doodleActive = !i.doodleActive })} title="Doodle / Draw">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                        </button>
                        <button className={`tool-icon action-star ${img.improve4k || img.improveMenuOpen ? 'is-active' : ''}`} disabled={isAssigned} onClick={() => onTaskChange(task.id, (draft) => { const i = draft.generatedImages?.find(x => x.id === img.id); if (i) { if (i.improve4k) { i.improve4k = false; i.improveMenuOpen = false } else { i.improveMenuOpen = !i.improveMenuOpen; i.splitMenuOpen = false; i.assignMenuOpen = false; } } })} title="Improve 4K">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" /></svg>
                        </button>
                        <button className={`tool-icon action-cut ${img.splitGrid || img.splitMenuOpen ? 'is-active' : ''}`} disabled={isAssigned} onClick={() => onTaskChange(task.id, (draft) => { const i = draft.generatedImages?.find(x => x.id === img.id); if (i) { if (i.splitGrid) { i.splitGrid = false; i.splitMenuOpen = false } else { i.splitMenuOpen = !i.splitMenuOpen; i.improveMenuOpen = false; i.assignMenuOpen = false; } } })} title="Split Grid (16x9 Panels)">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="3" y1="12" x2="21" y2="12" /></svg>
                        </button>
                      </div>

                      <div className="floating-tools right vertical">
                        <button className={`tool-icon assign-star ${isAssigned || img.assignMenuOpen ? 'is-active' : ''}`} onClick={() => {
                          if (isAssigned) {
                            onTaskChange(task.id, (draft) => { const i = draft.generatedImages?.find(x => x.id === img.id); if (i) { i.assignedType = undefined; i.assignedName = undefined; i.assignMenuOpen = false; } })
                          } else {
                            onTaskChange(task.id, (draft) => { const i = draft.generatedImages?.find(x => x.id === img.id); if (i) i.assignMenuOpen = !i.assignMenuOpen })
                          }
                        }} title={isAssigned ? "Unassign" : "Assign / Approve"}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        </button>

                        <button className={`tool-icon action-note ${img.noteActive || img.note ? 'is-active' : ''}`} disabled={isAssigned} onClick={() => onTaskChange(task.id, (draft) => { const i = draft.generatedImages?.find(x => x.id === img.id); if (i) i.noteActive = !i.noteActive })} title="Leave Note">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>

                        <button className="tool-icon discard" disabled={isAssigned} onClick={() => onTaskChange(task.id, (draft) => { draft.generatedImages = draft.generatedImages?.filter(i => i.id !== img.id) })} title="Discard">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                        </button>
                      </div>

                      {img.noteActive && !isAssigned && (
                        <div className="floating-note-area glass" style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', right: '0.5rem', zIndex: 6, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh' }}>
                          <div style={{ position: 'relative' }}>
                            <textarea
                              placeholder="Leave an iteration note..."
                              value={img.note || ''}
                              rows={3}
                              style={{ background: 'transparent', border: 'none', color: 'var(--cream)', outline: 'none', width: '100%', fontSize: '0.9rem', resize: 'vertical', lineHeight: 1.5, minHeight: '3.5em', maxHeight: '14rem', overflowY: 'auto', paddingRight: '2.5rem' }}
                              onChange={(e) => {
                                e.target.style.height = 'auto'
                                e.target.style.height = e.target.scrollHeight + 'px'
                                onTaskChange(task.id, (draft) => {
                                  const dImg = draft.generatedImages?.find(i => i.id === img.id)
                                  if (dImg) dImg.note = e.target.value
                                })
                              }}
                            />
                          </div>
                          {/* Full toolbar: attach, AI enhance, skills, model, attachments strip, OK */}
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            {/* Attach refs button */}
                            <input ref={dcNoteFileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => {
                              const files = Array.from(e.target.files || []).slice(0, 8 - dcNoteAttachments.length)
                              files.forEach(file => {
                                const formData = new FormData(); formData.append('file', file)
                                fetch('/api/storyboard/upload', { method: 'POST', body: formData }).then(r => r.json()).then(d => { if (d.url && dcNoteAttachments.length < 8) { setDcNoteAttachments(prev => prev.length < 8 ? [...prev, d.url] : prev) } }).catch(() => {})
                              })
                              e.target.value = ''
                            }} />
                            <button className={`tool-icon ${dcNoteAttachOpen ? 'is-active' : ''}`} onClick={() => { setDcNoteAttachOpen(!dcNoteAttachOpen); setDcNoteModelOpen(false); setDcSkillOpen(false) }} title="Attach reference images" style={{ width: '2.2rem', height: '2.2rem' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
                            {/* AI enhance */}
                            <button className={`tool-icon ${dcNoteAiEnhancing ? 'is-active' : ''}`} disabled={dcNoteAiEnhancing || !(img.note || '').trim()} onClick={async () => {
                              setDcNoteAiEnhancing(true)
                              try {
                                let skillInstructions = ''
                                for (const sk of dcAttachedSkills) {
                                  try { const r = await fetch('/api/skills/read-md', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sk.id }) }); const d = await r.json(); if (d.content) skillInstructions += `\n--- Skill: ${sk.name} ---\n${d.content.substring(0, 2000)}\n` } catch {}
                                }
                                const feedback = skillInstructions ? `You MUST follow these skill instructions:\n${skillInstructions}\nApply the skill rules to transform the prompt.` : 'Enhance this for cinematic AI image generation. Add lighting, camera angle, mood details.'
                                const imageCtx = img.url ? `\nLooking at image: ${img.url}` : ''
                                const attachCtx = dcNoteAttachments.length > 0 ? `\nAttached refs: ${dcNoteAttachments.map((u, i) => `@img${i + 1}`).join(', ')}` : ''
                                const result = await refinePrompt(img.note || '', feedback + imageCtx + attachCtx + '\nIMPORTANT: Output ONLY the final prompt text.')
                                if (result.text) {
                                  let cleaned = result.text.replace(/^(Here'?s?|OK|Sure|I'?ll|Let me|Now I|The refined|The enhanced|Here is|Certainly|Of course)[^\n]*\n+/i, '').trim()
                                  onTaskChange(task.id, draft => { const dImg = draft.generatedImages?.find(i => i.id === img.id); if (dImg) dImg.note = cleaned })
                                }
                              } catch {}
                              setDcNoteAiEnhancing(false)
                            }} title="AI Enhance prompt" style={{ width: '2.2rem', height: '2.2rem' }}>{dcNoteAiEnhancing ? <span style={{ fontSize: '0.65rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg>}</button>
                            {/* Skills button */}
                            <button className={`tool-icon ${dcSkillOpen ? 'is-active' : ''}`} onClick={() => { setDcSkillOpen(!dcSkillOpen); setDcNoteModelOpen(false); setDcNoteAttachOpen(false); if (!dcSkillOpen) fetch('/api/skills/list').then(r => r.json()).then(d => setDcAvailableSkills(d.skills || [])).catch(() => {}) }} title="Skills & Prompts" style={{ width: '2.2rem', height: '2.2rem' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>
                            {/* Model config */}
                            <button className={`tool-icon ${dcNoteModelOpen ? 'is-active' : ''}`} onClick={() => { setDcNoteModelOpen(!dcNoteModelOpen); setDcSkillOpen(false); setDcNoteAttachOpen(false) }} title="Model & config" style={{ width: '2.2rem', height: '2.2rem' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
                            {/* CENTER: attachments + skills */}
                            <div style={{ flex: 1, display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', minHeight: '2.2rem' }}>
                              {dcNoteAttachments.map((url, i) => (
                                <div key={`dcatt-${i}`} style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(248,217,120,0.3)', flexShrink: 0 }}>
                                  <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                  <div style={{ position: 'absolute', top: 0, left: 0, background: 'rgba(0,0,0,0.7)', borderRadius: '0 0 3px 0', padding: '0 2px', fontSize: '0.45rem', color: 'var(--gold)', fontWeight: 700 }}>{i + 1}</div>
                                  <button type="button" onClick={() => setDcNoteAttachments(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: '1px', right: '1px', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.5rem', borderRadius: '50%', width: '12px', height: '12px', display: 'grid', placeItems: 'center', padding: 0 }}>×</button>
                                </div>
                              ))}
                              {dcAttachedSkills.map(s => (
                                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', padding: '0.1rem 0.35rem', borderRadius: '999px', background: 'rgba(248,217,120,0.08)', border: '1px solid rgba(248,217,120,0.2)', fontSize: '0.5rem', color: 'var(--gold)' }}>
                                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                                  {s.name}
                                  <button type="button" onClick={() => setDcAttachedSkills(prev => prev.filter(sk => sk.id !== s.id))} style={{ background: 'none', border: 'none', color: 'rgba(248,217,120,0.5)', cursor: 'pointer', fontSize: '0.55rem', padding: 0 }}>×</button>
                                </div>
                              ))}
                              {dcNoteAttachments.length === 0 && dcAttachedSkills.length === 0 && (
                                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem' }}>{dcNoteAttachments.length}/8 refs</span>
                              )}
                            </div>
                            {/* OK submit */}
                            <button className="tick-save-btn" style={{ flexShrink: 0 }} onClick={() => { onTaskChange(task.id, (draft) => { const i = draft.generatedImages?.find(x => x.id === img.id); if (i) { i.noteActive = false; (i as any).noteAttachedImages = dcNoteAttachments.length > 0 ? [...dcNoteAttachments] : undefined } }); setDcNoteAttachments([]) }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                          </div>
                          {/* Model config popup */}
                          {dcNoteModelOpen && (
                            <div className="glass" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(12,12,20,0.98)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 10000, minWidth: '280px', boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(248,217,120,0.1)' }}>
                              <div style={{ fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 600, marginBottom: '0.6rem' }}>Models</div>
                              {['gemini-3.1-flash', 'seedream-4.5', 'seedream-5.0-lite', 'gpt-image-2.0'].map(m => (
                                <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', padding: '0.25rem 0', cursor: 'pointer' }}>
                                  <input type="checkbox" checked={!!dcNoteSelectedModels[m]} onChange={() => setDcNoteSelectedModels(prev => ({ ...prev, [m]: !prev[m] }))} style={{ accentColor: 'var(--gold)' }} />
                                  {m}
                                </label>
                              ))}
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.6rem' }}>Batch: {dcNoteBatchSize}</div>
                              <input type="range" min={1} max={4} value={dcNoteBatchSize} onChange={e => setDcNoteBatchSize(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--gold)' }} />
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.4rem' }}>Aspect: {dcNoteAspectRatio}</div>
                              <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem' }}>
                                {['16:9', '9:16', '1:1', '4:3'].map(ar => (
                                  <button key={ar} type="button" onClick={() => setDcNoteAspectRatio(ar)} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: dcNoteAspectRatio === ar ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.1)', background: dcNoteAspectRatio === ar ? 'rgba(248,217,120,0.1)' : 'transparent', color: dcNoteAspectRatio === ar ? 'var(--gold)' : 'rgba(255,255,255,0.5)', fontSize: '0.7rem', cursor: 'pointer' }}>{ar}</button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* DC Skills Store Modal — rendered outside note area */}
                      {dcSkillOpen && <LbSkillStoreModal compact lbAvailableSkills={dcAvailableSkills} lbAttachedSkills={dcAttachedSkills} setLbAttachedSkills={setDcAttachedSkills} setLbSkillOpen={setDcSkillOpen} setLbAvailableSkills={setDcAvailableSkills} lbSkillsPage={dcSkillsPage} setLbSkillsPage={setDcSkillsPage} onInjectPrompt={(text: string) => { onTaskChange(task.id, draft => { const activeImg = draft.generatedImages?.find(i => i.noteActive); if (activeImg) activeImg.note = text }); setDcSkillOpen(false) }} />}

                      {/* DC Attach References Window — full version matching lightbox */}
                      {dcNoteAttachOpen && (() => {
                        const dcAttachTabs = [
                          { key: 'all' as const, label: 'Images', icon: 'M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
                          { key: 'actors' as const, label: 'Actors', icon: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z' },
                          { key: 'locations' as const, label: 'Locations', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z' },
                          { key: 'props' as const, label: 'Props', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
                        ]
                        const filterDcResources = (type: 'actors' | 'locations' | 'props') => {
                          const all = data.resources[type] || []
                          return all
                        }
                        return (
                        <div className="assign-menu-glass glass" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', maxWidth: '800px', maxHeight: '85vh', width: '94vw', zIndex: 10000, background: 'rgba(12,12,20,0.98)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 40px rgba(248,217,120,0.12)' }} onClick={(e) => e.stopPropagation()}>
                          <div className="assign-menu-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '1.3rem' }}>
                            <span>Attach References ({dcNoteAttachments.length}/8)</span>
                            <button type="button" onClick={() => dcNoteFileRef.current?.click()} style={{ padding: '0.5rem 1.2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '2rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.95rem' }}>↑ Upload</button>
                          </div>
                          <button type="button" onClick={() => { setDcNoteAttachOpen(false); setDcNoteAttachShowAll(false) }} style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.6rem' }}>✕</button>
                          <button type="button" onClick={() => { setDcNoteAttachOpen(false); setDcNoteAttachShowAll(false) }} style={{ position: 'absolute', bottom: '1rem', right: '1rem', padding: '0.6rem 1.6rem', background: 'linear-gradient(135deg, var(--gold), #e0b94c)', color: '#111', border: 'none', borderRadius: '2rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(248,217,120,0.3)', transition: 'all 0.2s', zIndex: 5 }}>Done</button>

                          {/* Resource Type Tabs */}
                          <div style={{ display: 'flex', gap: '0.4rem', padding: '0 0 0.6rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {dcAttachTabs.map(tab => (
                              <button key={tab.key} type="button" onClick={() => { setDcNoteAttachTab(tab.key); setDcNoteAttachShowAll(false) }} style={{ padding: '0.6rem 1rem', borderRadius: '0.5rem', border: `1px solid ${dcNoteAttachTab === tab.key ? 'rgba(248,217,120,0.35)' : 'rgba(255,255,255,0.06)'}`, background: dcNoteAttachTab === tab.key ? 'rgba(248,217,120,0.08)' : 'transparent', color: dcNoteAttachTab === tab.key ? 'var(--gold)' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.45rem', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={tab.icon}/></svg>
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* Content area */}
                          <div style={{ maxHeight: '48vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '0.4rem 0' }}>
                            {dcNoteAttachTab === 'all' ? (
                              data.acts.map(act => {
                                const actImages = act.scenes.flatMap(s => getSceneShots(s, 'images').flatMap(sh => sh.media.filter(m => m.type === 'image')))
                                if (actImages.length === 0) return null
                                return (
                                <details key={act.id} open>
                                  <summary style={{ color: 'var(--gold)', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', padding: '0.4rem 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', userSelect: 'none' }}>
                                    <span style={{ fontSize: '0.9rem', transition: 'transform 0.2s' }}>▸</span> {act.title} <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontSize: '0.85rem' }}>({actImages.length})</span>
                                  </summary>
                                  {act.scenes.map(scene => {
                                    const shots = getSceneShots(scene, 'images')
                                    const sceneImages = shots.flatMap(s => s.media.filter(m => m.type === 'image'))
                                    if (sceneImages.length === 0) return null
                                    return (
                                      <div key={scene.id} style={{ marginBottom: '0.6rem', marginLeft: '0.5rem' }}>
                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '0.35rem', fontWeight: 500 }}>{scene.title}</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                                          {sceneImages.slice(0, 20).map((m) => (
                                            <button key={m.id} type="button" disabled={dcNoteAttachments.length >= 8 || dcNoteAttachments.includes(m.url)} onClick={() => { if (dcNoteAttachments.length < 8) setDcNoteAttachments(prev => [...prev, m.url]) }} style={{ width: '100%', aspectRatio: '16/11', borderRadius: '6px', overflow: 'hidden', border: dcNoteAttachments.includes(m.url) ? '2.5px solid var(--gold)' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', padding: 0, background: 'rgba(0,0,0,0.3)', opacity: dcNoteAttachments.includes(m.url) ? 1 : 0.75, transition: 'all 0.15s', position: 'relative' }}>
                                              <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                              {dcNoteAttachments.includes(m.url) && <div style={{ position: 'absolute', top: '3px', right: '3px', background: 'var(--gold)', borderRadius: '50%', width: '24px', height: '24px', display: 'grid', placeItems: 'center', color: '#000', fontSize: '0.75rem', fontWeight: 800 }}>{dcNoteAttachments.indexOf(m.url) + 1}</div>}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </details>
                                )
                              })
                            ) : (
                              (() => {
                                const resources = filterDcResources(dcNoteAttachTab)
                                return (
                                  <>
                                    {resources.map((resource: any) => {
                                      const allMedia = [...(resource.media || []), ...(resource.sheetMedia || [])].filter((m: any) => m.type === 'image')
                                      return (
                                        <div key={resource.name} style={{ marginBottom: '0.8rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.6rem', padding: '0.6rem' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', fontWeight: 600 }}>{resource.name}</span>
                                            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>{allMedia.length} img{allMedia.length !== 1 ? 's' : ''}</span>
                                          </div>
                                          {allMedia.length > 0 && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                                              {allMedia.slice(0, 9).map((m: any) => (
                                                <button key={m.id} type="button" disabled={dcNoteAttachments.length >= 8 || dcNoteAttachments.includes(m.url)} onClick={() => { if (dcNoteAttachments.length < 8) setDcNoteAttachments(prev => [...prev, m.url]) }} style={{ width: '100%', aspectRatio: '16/11', borderRadius: '6px', overflow: 'hidden', border: dcNoteAttachments.includes(m.url) ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', padding: 0, background: 'rgba(0,0,0,0.3)', opacity: dcNoteAttachments.includes(m.url) ? 1 : 0.75, transition: 'all 0.15s', position: 'relative' }}>
                                                  <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                  {dcNoteAttachments.includes(m.url) && <div style={{ position: 'absolute', top: '2px', right: '2px', background: 'var(--gold)', borderRadius: '50%', width: '16px', height: '16px', display: 'grid', placeItems: 'center', color: '#000', fontSize: '0.55rem', fontWeight: 800 }}>{dcNoteAttachments.indexOf(m.url) + 1}</div>}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </>
                                )
                              })()
                            )}
                          </div>
                          {/* Current attachments strip */}
                          {dcNoteAttachments.length > 0 && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.6rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {dcNoteAttachments.map((url, i) => (
                                <div key={`dcatt-strip-${i}`} style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--gold)' }}>
                                  <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                  <div style={{ position: 'absolute', top: '2px', left: '2px', background: 'var(--gold)', borderRadius: '50%', width: '18px', height: '18px', display: 'grid', placeItems: 'center', color: '#000', fontSize: '0.6rem', fontWeight: 800 }}>{i + 1}</div>
                                  <button type="button" onClick={() => setDcNoteAttachments(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.65rem', borderRadius: '50%', width: '16px', height: '16px', display: 'grid', placeItems: 'center', padding: 0 }}>×</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        )
                      })()}

                      {img.assignMenuOpen && !isAssigned && (() => {
                        const dcAssignTabs = [
                          { key: 'image' as const, label: 'Image', icon: 'M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
                          { key: 'actor' as const, label: 'Actor', icon: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z' },
                          { key: 'scene' as const, label: 'Location', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z' },
                          { key: 'props' as const, label: 'Props', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
                        ]
                        const doDcAssign = (resKey: 'actors' | 'locations' | 'props', name: string) => {
                          if (onAssignAsset) onAssignAsset(resKey, name, '', img.url)
                          onTaskChange(task.id, (draft) => {
                            const dImg = draft.generatedImages?.find(i => i.id === img.id)
                            if (dImg) { dImg.assignedType = resKey; dImg.assignedName = name; dImg.assignMenuOpen = false; dImg.selected = true }
                          })
                          setDcAssignNewName('')
                        }
                        const renderDcSlots = (resKey: 'actors' | 'locations' | 'props') => {
                          const resources = data.resources[resKey] || []
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                              {resources.map((r: any) => {
                                const rImg = (r.media || [])[0]
                                return (
                                  <button key={r.name} type="button" onClick={() => doDcAssign(resKey, r.name)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.7rem', cursor: 'pointer', color: '#fff', transition: 'all 0.15s', width: '100%', textAlign: 'left' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(248,217,120,0.4)'; e.currentTarget.style.background = 'rgba(248,217,120,0.06)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}>
                                    {rImg ? <img src={rImg.url} style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} alt="" /> : <div style={{ width: '64px', height: '64px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '1.6rem', flexShrink: 0 }}>∅</div>}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{r.name}</div>
                                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>{(r.media || []).length} image{(r.media || []).length !== 1 ? 's' : ''}</div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(64,255,156,0.5)' }}>+ Add →</div>
                                  </button>
                                )
                              })}
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input type="text" value={dcAssignNewName} onChange={e => setDcAssignNewName(e.target.value)} placeholder={`New ${resKey === 'actors' ? 'actor' : resKey === 'locations' ? 'location' : 'prop'}...`} style={{ flex: 1, padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '0.6rem', color: '#fff', fontSize: '1rem', outline: 'none' }} onKeyDown={e => { if (e.key === 'Enter' && dcAssignNewName.trim()) { doDcAssign(resKey, dcAssignNewName.trim()); setDcAssignNewName('') } }} />
                                <button type="button" disabled={!dcAssignNewName.trim()} onClick={() => { if (dcAssignNewName.trim()) { doDcAssign(resKey, dcAssignNewName.trim()); setDcAssignNewName('') } }} style={{ padding: '0.7rem 1.2rem', background: dcAssignNewName.trim() ? 'var(--gold)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '0.6rem', color: dcAssignNewName.trim() ? '#000' : 'rgba(255,255,255,0.2)', cursor: dcAssignNewName.trim() ? 'pointer' : 'default', fontSize: '0.95rem', fontWeight: 700, transition: 'all 0.15s' }}>+ Add</button>
                              </div>
                            </div>
                          )
                        }
                        return (
                        <div className="assign-menu-glass glass" style={{ maxWidth: '600px', width: '90vw', maxHeight: '80vh', position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10000, background: 'rgba(12,12,20,0.98)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                          <div className="assign-menu-title" style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Assign to Scene</div>
                          <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {dcAssignTabs.map(tab => (
                              <button key={tab.key} type="button" onClick={() => { setDcAssignTab(tab.key); setDcAssignNewName(''); setDcAssignExpandAct(null) }} style={{ padding: '0.7rem 1.2rem', border: 'none', borderBottom: dcAssignTab === tab.key ? '3px solid var(--gold)' : '3px solid transparent', background: 'none', color: dcAssignTab === tab.key ? 'var(--gold)' : 'rgba(255,255,255,0.4)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={tab.icon}/></svg>
                                {tab.label}
                              </button>
                            ))}
                          </div>
                          <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: '0.8rem 0' }}>
                            {dcAssignTab === 'image' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {data.acts.map(act => {
                                  const isExp = dcAssignExpandAct === act.id
                                  return (
                                    <div key={act.id}>
                                      <button type="button" onClick={() => setDcAssignExpandAct(isExp ? null : act.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.8rem 1rem', background: isExp ? 'rgba(248,217,120,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isExp ? 'rgba(248,217,120,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '0.6rem', cursor: 'pointer', color: isExp ? 'var(--gold)' : 'rgba(255,255,255,0.7)', fontSize: '1rem', fontWeight: 600, transition: 'all 0.15s', textAlign: 'left' }}>
                                        <span style={{ fontSize: '0.9rem', transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▸</span>
                                        {act.title}
                                        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>{act.scenes.length} scenes</span>
                                      </button>
                                      {isExp && (
                                        <div style={{ padding: '0.5rem 0 0.5rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                          {act.scenes.map(scene => {
                                            const scImgs = getSceneShots(scene, 'images').flatMap(s => s.media.filter(m => m.type === 'image'))
                                            return (
                                              <div key={scene.id}>
                                                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: '0.4rem' }}>{scene.title}</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.35rem' }}>
                                                  {scImgs.slice(0, 15).map(m => (
                                                    <button key={m.id} type="button" onClick={() => {
                                                      if (onAssignAsset) onAssignAsset('image', '', scene.id, img.url)
                                                      onTaskChange(task.id, (draft) => { const dImg = draft.generatedImages?.find(i => i.id === img.id); if (dImg) { dImg.assignedType = 'image'; dImg.assignedName = scene.title; dImg.assignMenuOpen = false; dImg.selected = true } })
                                                    }} style={{ width: '100%', aspectRatio: '16/11', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', padding: 0, background: 'rgba(0,0,0,0.3)', opacity: 0.75, transition: 'all 0.15s' }}>
                                                      <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                    </button>
                                                  ))}
                                                  <button type="button" onClick={() => {
                                                    if (onAssignAsset) onAssignAsset('image', '', scene.id, img.url)
                                                    onTaskChange(task.id, (draft) => { const dImg = draft.generatedImages?.find(i => i.id === img.id); if (dImg) { dImg.assignedType = 'image'; dImg.assignedName = scene.title; dImg.assignMenuOpen = false; dImg.selected = true } })
                                                  }} style={{ width: '100%', aspectRatio: '16/11', borderRadius: '6px', border: '2px dashed rgba(248,217,120,0.3)', background: 'rgba(248,217,120,0.04)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'rgba(248,217,120,0.5)', fontSize: '1.8rem', transition: 'all 0.15s' }}>+</button>
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : dcAssignTab === 'actor' ? renderDcSlots('actors') : dcAssignTab === 'scene' ? renderDcSlots('locations') : renderDcSlots('props')}
                          </div>
                          <button type="button" onClick={() => onTaskChange(task.id, (draft) => { const dImg = draft.generatedImages?.find(i => i.id === img.id); if (dImg) dImg.assignMenuOpen = false })} style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.6rem' }}>✕</button>
                        </div>
                        )
                      })()}

                      {img.improveMenuOpen && !isAssigned && (
                        <div className="enhance-menu-glass glass">
                          <div className="assign-menu-title">Quality Enhancement</div>
                          <textarea
                            className="enhance-prompt-input"
                            placeholder="Use exact @img1 exact same image camera angle and architecture. but improve quality of character(s) and resolution. do not change composition, architecture or objects, the objects and the characters should remain in same poses, emotions and position and all the same as @img1 only improve quality, 3d animated movie, cinemtic AAA level 3d animation, true depth of field, details, subsurfac scatteiring, do not change anything else the camera distance and angle should remain exact same as image1."
                            value={img.improvePrompt || ''}
                            onChange={e => onTaskChange(task.id, draft => {
                              const dImg = draft.generatedImages?.find(i => i.id === img.id);
                              if (dImg) dImg.improvePrompt = e.target.value;
                            })}
                          />
                          <div className="enhance-options-row">
                            <div className="custom-status-dropdown enhance-select" onClick={(e) => {
                              e.stopPropagation();
                              const el = e.currentTarget.querySelector('.status-dropdown-menu');
                              if (el) el.classList.toggle('is-open');
                            }}>
                              {img.improveModel || 'Seadream 4.5'}
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                              <div className="status-dropdown-menu glass">
                                {['Seadream 4.5', 'Nano Banana Pro', 'Nano Banano 2', 'GPT-2 Medium'].map((m) => (
                                  <div key={m} className="status-option" onClick={(e) => {
                                    e.stopPropagation();
                                    onTaskChange(task.id, draft => { const d = draft.generatedImages?.find(i => i.id === img.id); if (d) d.improveModel = m; });
                                    e.currentTarget.parentElement?.classList.remove('is-open');
                                  }}>{m}</div>
                                ))}
                              </div>
                            </div>

                            <div className="custom-status-dropdown enhance-select" onClick={(e) => {
                              e.stopPropagation();
                              const el = e.currentTarget.querySelector('.status-dropdown-menu');
                              if (el) el.classList.toggle('is-open');
                            }}>
                              {img.improveRes || '4K Res'}
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                              <div className="status-dropdown-menu glass">
                                {['4K Res', '2K Res'].map((r) => (
                                  <div key={r} className="status-option" onClick={(e) => {
                                    e.stopPropagation();
                                    onTaskChange(task.id, draft => { const d = draft.generatedImages?.find(i => i.id === img.id); if (d) d.improveRes = r; });
                                    e.currentTarget.parentElement?.classList.remove('is-open');
                                  }}>{r}</div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="assign-type-row" style={{ marginTop: '0.5rem' }}>
                            <span style={{ color: 'var(--gold)', fontSize: '0.75rem', alignSelf: 'center', marginRight: '0.5rem' }}>Reference:</span>
                            {['actor', 'prop', 'location'].map((t) => (
                              <button key={t} className={`type-btn ${img.improveRefType === t ? 'is-active' : ''}`} onClick={() => onTaskChange(task.id, draft => { const d = draft.generatedImages?.find(i => i.id === img.id); if (d) { d.improveRefType = d.improveRefType === t ? undefined : t; } })}>
                                {t}
                              </button>
                            ))}
                          </div>
                          {img.improveRefType && (
                            <>
                              <input type="text" placeholder={`Type ${img.improveRefType} name...`} className="assign-name-input" style={{ marginTop: '0.5rem', padding: '0.6rem' }} value={img.improveRefName || ''} onChange={e => onTaskChange(task.id, draft => { const d = draft.generatedImages?.find(i => i.id === img.id); if (d) d.improveRefName = e.target.value; })} />
                              <div className="assign-scene-scroll">
                                <div className="scene-scroll-group">
                                  {img.improveRefType === 'actor' && data.actors.map(name => (
                                    <button key={name} className={img.improveRefName === name ? 'is-active' : ''} onClick={() => onTaskChange(task.id, draft => { const d = draft.generatedImages?.find(i => i.id === img.id); if (d) d.improveRefName = name; })}>{name}</button>
                                  ))}
                                  {img.improveRefType === 'location' && data.locations.map(name => (
                                    <button key={name} className={img.improveRefName === name ? 'is-active' : ''} onClick={() => onTaskChange(task.id, draft => { const d = draft.generatedImages?.find(i => i.id === img.id); if (d) d.improveRefName = name; })}>{name}</button>
                                  ))}
                                  {img.improveRefType === 'prop' && data.resources['props']?.map(p => (
                                    <button key={p.id} className={img.improveRefName === p.name ? 'is-active' : ''} onClick={() => onTaskChange(task.id, draft => { const d = draft.generatedImages?.find(i => i.id === img.id); if (d) d.improveRefName = p.name; })}>{p.name}</button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}

                          <div className="assign-keep-row mt-2">
                            <button className="keep-image-btn" onClick={() => {
                              onTaskChange(task.id, draft => {
                                const dImg = draft.generatedImages?.find(i => i.id === img.id);
                                if (dImg) { dImg.improve4k = true; dImg.improveMenuOpen = false; }
                              });
                              fetch('/api/tasks/improve-pixverse', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  taskId: task.id,
                                  imageId: img.id,
                                  imagePath: img.path,
                                  prompt: img.improvePrompt || enhancePrompt
                                })
                              }).catch(() => {});
                            }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                          </div>
                        </div>
                      )}

                      {img.splitMenuOpen && !isAssigned && (
                        <div className="enhance-menu-glass glass">
                          <div className="assign-menu-title">Split Grid Blueprint</div>
                          <div className="enhance-options-row">
                            {['2x2', '3x2', '3x3'].map(grid => (
                              <button key={grid} className={`type-btn ${img.splitType === grid || (!img.splitType && grid === '2x2') ? 'is-active' : ''}`} onClick={() => onTaskChange(task.id, draft => { const dImg = draft.generatedImages?.find(i => i.id === img.id); if (dImg) dImg.splitType = grid; })}>
                                {grid} Grid
                              </button>
                            ))}
                          </div>
                          <div className="assign-keep-row mt-2">
                            <button className="keep-image-btn" onClick={() => onTaskChange(task.id, draft => {
                              const dImg = draft.generatedImages?.find(i => i.id === img.id);
                              if (dImg) { dImg.splitGrid = true; dImg.splitMenuOpen = false; }
                            })}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                          </div>
                        </div>
                      )}

                      {img.doodleActive && !isAssigned && (
                        <DoodleCanvas initialDataUrl={img.doodleDataUrl} onClose={(dataUrl) => onTaskChange(task.id, draft => { const d = draft.generatedImages?.find(i => i.id === img.id); if (d) { d.doodleActive = false; if (dataUrl) d.doodleDataUrl = dataUrl; } })} />
                      )}
                    </div>
                  )}
                </div>
              )
            })})()} 
          </div>

          {/* Glassmorphism Batch Note Popup — Full featured with attachments + AI enhance */}
          {batchNoteOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.15s ease' }} onClick={(e) => { if (e.target === e.currentTarget) setBatchNoteOpen(false) }}>
              <div style={{ width: 'min(92%, 560px)', maxHeight: '85vh', overflowY: 'auto', background: 'linear-gradient(145deg, rgba(20,20,30,0.97), rgba(10,10,20,0.99))', border: '1px solid rgba(248,217,120,0.15)', borderRadius: '1.5rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 50px rgba(248,217,120,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: 'var(--gold)', fontSize: '1.15rem', fontFamily: '"Outfit", sans-serif', fontWeight: 700 }}>Edit Note — {selectedImageIds.length} Image{selectedImageIds.length > 1 ? 's' : ''}</h3>
                  <button type="button" onClick={() => setBatchNoteOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'rgba(255,255,255,0.5)', width: '32px', height: '32px', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                </div>

                {/* Note textarea with AI enhance button */}
                <div style={{ position: 'relative' }}>
                  <textarea value={batchNoteText} onChange={(e) => setBatchNoteText(e.target.value)} placeholder="Describe exactly what changes you want. This text will be sent directly as the prompt to PixVerse..." autoFocus style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '1rem', paddingRight: '3rem', color: 'white', fontSize: '0.95rem', lineHeight: '1.6', minHeight: '140px', maxHeight: '300px', width: '100%', resize: 'vertical', overflowY: 'auto', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  {/* Magic wand AI enhance */}
                  <button type="button" title="AI Enhance Note" disabled={batchNoteEnhancing || !batchNoteText.trim()} onClick={async () => {
                    setBatchNoteEnhancing(true)
                    try {
                      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyByGTS8kcuNGPK9sKNPcU-9iEaAP93uW78`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          contents: [{ role: 'user', parts: [{ text: `Improve this image editing note into a clear, detailed prompt for an image generation AI. Keep the exact intent but make it more precise and descriptive. Output ONLY the improved text:\n\n"${batchNoteText}"` }] }],
                          systemInstruction: { parts: [{ text: "You are a visual director writing precise image generation prompts. Be concise but specific." }] }
                        })
                      })
                      if (res.ok) {
                        const d = await res.json()
                        const improved = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
                        if (improved) setBatchNoteText(improved)
                      }
                    } catch {}
                    setBatchNoteEnhancing(false)
                  }} style={{ position: 'absolute', bottom: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', background: batchNoteEnhancing ? 'rgba(248,217,120,0.2)' : 'rgba(248,217,120,0.1)', border: '1px solid rgba(248,217,120,0.3)', color: batchNoteEnhancing ? 'rgba(248,217,120,0.5)' : 'var(--gold)', display: 'grid', placeItems: 'center', cursor: batchNoteEnhancing ? 'wait' : 'pointer', transition: 'all 0.2s' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: batchNoteEnhancing ? 'pulse 1s infinite' : 'none' }}><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"></path></svg>
                  </button>
                </div>

                {/* Attached reference images */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Reference Images ({batchNoteAttachments.length}/5)</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {batchNoteAttachments.map((url, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
                        <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Ref ${idx + 1}`} />
                        <button type="button" onClick={() => setBatchNoteAttachments(prev => prev.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', fontSize: '0.5rem', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                    {batchNoteAttachments.length < 5 && (
                      <>
                        <button type="button" title="Attach from Scene" onClick={() => {
                          // Show scene images to attach
                          const sceneImages = (task.generatedImages || []).filter(i => !selectedImageIds.includes(i.id)).slice(0, 20)
                          if (sceneImages.length > 0) {
                            const url = sceneImages[0]?.url
                            if (url) setBatchNoteAttachments(prev => [...prev.slice(0, 4), url])
                          }
                        }} style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.6rem', gap: '4px', transition: 'all 0.2s' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                          Scene
                        </button>
                        <button type="button" title="Upload from Disk" onClick={() => noteFileInputRef.current?.click()} style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.6rem', gap: '4px', transition: 'all 0.2s' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                          Upload
                        </button>
                        <input ref={noteFileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          const remaining = 5 - batchNoteAttachments.length
                          files.slice(0, remaining).forEach(file => {
                            const formData = new FormData()
                            formData.append('file', file)
                            fetch('/api/storyboard/upload', { method: 'POST', body: formData }).then(r => r.json()).then(d => {
                              if (d.url) setBatchNoteAttachments(prev => prev.length < 5 ? [...prev, d.url] : prev)
                            }).catch(() => {})
                          })
                          e.target.value = ''
                        }} />
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setBatchNoteOpen(false)} style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', borderRadius: '2rem', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                  <button type="button" onClick={() => {
                    if (batchNoteText.trim()) {
                      onTaskChange(task.id, draft => {
                        if (draft.passes) {
                          const pIdx = draft.passes.findIndex(p => p.id === draft.activePassId);
                          if (pIdx !== -1 && draft.passes[pIdx].images) {
                            draft.passes[pIdx].images = draft.passes[pIdx].images.map(i =>
                              selectedImageIds.includes(i.id) ? { ...i, note: batchNoteText, noteAttachedImages: batchNoteAttachments } as any : i
                            );
                          }
                        }
                        if (draft.generatedImages) {
                          draft.generatedImages = draft.generatedImages.map(i =>
                            selectedImageIds.includes(i.id) ? { ...i, note: batchNoteText, noteAttachedImages: batchNoteAttachments } as any : i
                          );
                        }
                      })
                    }
                    setBatchNoteOpen(false)
                    setBatchNoteAttachments([])
                  }} style={{ padding: '0.6rem 1.5rem', background: 'var(--gold)', border: 'none', color: '#000', borderRadius: '2rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>Apply Note</button>
                </div>
              </div>
            </div>
          )}


        </div>
      )}

      {task.status.startsWith('pass') && (
        <div className="task-actions" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="task-actions-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" onClick={() => onTaskChange(task.id, (draftTask) => { draftTask.status = 'archived' })} style={{ color: 'rgba(255,42,85,0.8)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.4rem' }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Archive Task
            </button>
            <button type="button" style={{ background: 'var(--gold)', color: '#000', padding: '0.8rem 2.5rem', borderRadius: '3rem', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(248, 217, 120, 0.3)' }} onClick={handleRunAgent}>
              Run Agent
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function AgentInbox({
  draft,
  onAdd,
  // onBack removed
  onDraftChange,
  onTaskChange,
  tasks,
  data,
  onAssignAsset,
}: {
  draft: { title: string; sceneHint: string; skillHint: string; prompt: string }
  onAdd: () => void
  // onBack removed from signature
  onDraftChange: (draft: { title: string; sceneHint: string; skillHint: string; prompt: string }) => void
  onTaskChange: (taskId: string, mutate: (task: AgentTask) => void) => void
  tasks: AgentTask[]
  data: StoryboardData
  onAssignAsset?: (type: string, name: string, sceneId: string, url: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'edit' | 'archived'>('tasks')
  const [tasksSubTab, setTasksSubTab] = useState<'queue' | 'completed'>('queue')
  const [activeTaskIds, setActiveTaskIds] = useState<Record<string, string>>({})
  const [mediaTab, setMediaTab] = useState<'images' | 'videos'>('images')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [scenePickerTab, setScenePickerTab] = useState<'images' | 'videos' | 'characters' | 'locations' | 'props' | 'styles' | 'upload'>('images')
  const [sceneSelections, setSceneSelections] = useState<string[]>([])
  const [expandedActs, setExpandedActs] = useState<Record<string, boolean>>({})
  const [expandedScenes, setExpandedScenes] = useState<Record<string, boolean>>({})
  const [showBlueprintGallery, setShowBlueprintGallery] = useState(false)
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [pdfDocs, setPdfDocs] = useState<any[]>([])
  const [activePdf, setActivePdf] = useState<string | null>(null)
  const [pdfPages, setPdfPages] = useState<string[]>([])
  const [pdfCurrentPage, setPdfCurrentPage] = useState(0)
  const [pdfMarkers, setPdfMarkers] = useState<Record<string, Array<{ page: number, color: string, startIdx: number, endIdx: number }>>>({})
  const [activeMarkerColor, setActiveMarkerColor] = useState('#ffe14d')
  const [blueprintSaveModal, setBlueprintSaveModal] = useState<AgentTask | null>(null)
  const [savedBlueprints, setSavedBlueprints] = useState<any[]>([])
  const [composerTab, setComposerTab] = useState<'agent' | 'task' | 'promptBuilder'>('agent')
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)
  const [archiveSearch, setArchiveSearch] = useState('')
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [taskSelectMode, setTaskSelectMode] = useState(false)
  const [agentHistory, setAgentHistory] = useState<AgentMessage[]>([])
  const [agentInput, setAgentInput] = useState('')
  const [agentLoading, setAgentLoading] = useState(false)
  const [showSkillsStore, setShowSkillsStore] = useState(false)
  const [availableSkills, setAvailableSkills] = useState<any[]>([])
  const [newSkillText, setNewSkillText] = useState('')
  const [newSkillTitle, setNewSkillTitle] = useState('')
  const [skillRecording, setSkillRecording] = useState(false)
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [aiImproving, setAiImproving] = useState(false)
  const [skillsPage, setSkillsPage] = useState(0)
  const skillRecognitionRef = useRef<any>(null)
  const [dcStoreTab, setDcStoreTab] = useState<'skills' | 'prompts'>('skills')
  const [newPromptTitle, setNewPromptTitle] = useState('')
  const [newPromptText, setNewPromptText] = useState('')
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/skills/list').then(r => r.json()).then(d => {
      const skills = d.skills || [];
      const seen = new Set<string>();
      const seenNames = new Set<string>();
      const unique = skills.filter((s: any) => { if (seen.has(s.id) || seenNames.has(s.name)) return false; seen.add(s.id); seenNames.add(s.name); return true });
      setAvailableSkills(unique);
    }).catch(() => { })
  }, [showSkillsStore])

  // Load blueprints from disk on mount
  useEffect(() => {
    fetch('/api/blueprints/list').then(r => r.json()).then(d => {
      if (d.blueprints && d.blueprints.length > 0) setSavedBlueprints(d.blueprints);
    }).catch(() => {})
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'skill' | 'ref') => {
    const file = e.target.files?.[0]
    if (file) {
      if (type === 'skill') onDraftChange({ ...draft, skillHint: file.name })
    }
  }

  const pass1Tasks = tasks.filter(t => t.status.startsWith('pass1'))
  const activePass1Task = pass1Tasks.find(t => t.id === activeTaskIds['pass1']) || pass1Tasks[0]

  const pass2Tasks = tasks.filter(t => t.status.startsWith('pass2') || t.status.startsWith('pass3'))
  const activePass2Task = pass2Tasks.find(t => t.id === activeTaskIds['pass2']) || pass2Tasks[0]

  return (
    <div className="storyboard-stage agent-canvas">
      {isModalOpen && (
        <div className="skills-store-backdrop" onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(90vw, 900px)', maxHeight: '85vh', background: 'linear-gradient(145deg, rgba(20,20,30,0.95), rgba(10,10,20,0.98))', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '1.5rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(212,175,55,0.08), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            {/* Header */}
            <div style={{ padding: '1.2rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'white', fontWeight: 700 }}>Director's Visual Assignment</h2>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Browse assets by type · Click to attach to task</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'rgba(255,255,255,0.5)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            {/* Asset Type Tabs */}
            <div style={{ display: 'flex', gap: '0.3rem', padding: '0.8rem 2rem', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {([
                { key: 'images', label: 'Images', d: 'M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
                { key: 'videos', label: 'Videos', d: 'M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z' },
                { key: 'characters', label: 'Characters', d: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z' },
                { key: 'locations', label: 'Locations', d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0zM15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
                { key: 'props', label: 'Props', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
                { key: 'styles', label: 'Styles', d: 'M7 21a4 4 0 0 1-4-4V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v12a4 4 0 0 1-4 4zm0 0h12a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 0 1 2.828 0l2.829 2.829a2 2 0 0 1 0 2.828l-8.486 8.485' },
                { key: 'upload', label: 'Upload', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12' },
              ] as const).map(tab => (
                <button key={tab.key} type="button" onClick={() => setScenePickerTab(tab.key)} style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: `1px solid ${scenePickerTab === tab.key ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.06)'}`, background: scenePickerTab === tab.key ? 'rgba(212,175,55,0.08)' : 'transparent', color: scenePickerTab === tab.key ? 'var(--gold)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={tab.d} /></svg>
                  {tab.label}
                </button>
              ))}
              {sceneSelections.length > 0 && (
                <button type="button" onClick={() => { onDraftChange({ ...draft, sceneHint: sceneSelections.join(' | ') }); setSceneSelections([]); setIsModalOpen(false) }} style={{ marginLeft: 'auto', padding: '0.5rem 1.4rem', borderRadius: '0.6rem', border: '1px solid rgba(64,255,156,0.5)', background: 'rgba(64,255,156,0.12)', color: '#4ade80', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', boxShadow: '0 0 16px rgba(64,255,156,0.25)', transition: 'all 0.2s' }}>
                  Attach All · {sceneSelections.length}
                </button>
              )}
            </div>
            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 2rem' }}>
              {/* Images / Videos — Act → Scene → Thumbnails */}
              {(scenePickerTab === 'images' || scenePickerTab === 'videos') && data.acts.map(act => (
                <div key={act.id} style={{ marginBottom: '0.5rem' }}>
                  <button type="button" onClick={() => setExpandedActs(p => ({ ...p, [act.id]: !p[act.id] }))} style={{ width: '100%', background: expandedActs[act.id] ? 'rgba(212,175,55,0.05)' : 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.5rem', padding: '0.6rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedActs[act.id] ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}><polyline points="9 18 15 12 9 6" /></svg>
                    {act.title || 'Act'}
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{act.scenes.length} scenes</span>
                  </button>
                  {expandedActs[act.id] && act.scenes.map((scene, si) => (
                    <div key={scene.id} style={{ marginLeft: '1.2rem', marginTop: '0.3rem' }}>
                      <button type="button" onClick={() => setExpandedScenes(p => ({ ...p, [scene.id]: !p[scene.id] }))} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '0.4rem', padding: '0.45rem 0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', transition: 'all 0.2s' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedScenes[scene.id] ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}><polyline points="9 18 15 12 9 6" /></svg>
                        {scene.title || `Scene ${si + 1}`}
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>{(scenePickerTab === 'images' ? scene.imageShots : scene.videoShots).length} items</span>
                        {/* Quick select entire scene */}
                        <button type="button" onClick={(e) => { e.stopPropagation(); const v = `${act.title} - ${scene.title || `Scene ${si + 1}`}`; setSceneSelections(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]) }} style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '4px', color: 'var(--gold)', fontSize: '0.6rem', padding: '0.15rem 0.4rem', cursor: 'pointer' }}>Select Scene</button>
                      </button>
                      {expandedScenes[scene.id] && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem', padding: '0.5rem 0 0.5rem 1rem' }}>
                          {(scenePickerTab === 'images' ? scene.imageShots : scene.videoShots).map(shot => shot.media.map(m => (
                            <button key={m.id} type="button" onClick={() => { const v = `${act.title} - ${scene.title || `Scene ${si + 1}`} [${m.url.split('/').pop()}] ${m.url}`; setSceneSelections(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]) }} style={{ background: sceneSelections.some(s => s.includes(m.url)) ? 'rgba(64,255,156,0.1)' : 'rgba(0,0,0,0.3)', border: sceneSelections.some(s => s.includes(m.url)) ? '1px solid rgba(64,255,156,0.4)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '0.5rem', padding: '0.3rem', cursor: 'pointer', transition: 'all 0.2s', overflow: 'hidden', position: 'relative' }}>
                              <img src={m.url} alt="" loading="lazy" style={{ width: '100%', height: '65px', objectFit: 'cover', borderRadius: '0.3rem', display: 'block' }} />
                              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', padding: '0.2rem 0.1rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.url.split('/').pop()}</div>
                            </button>
                          ))).flat()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {/* Characters / Locations / Props / Styles — Resource Cards */}
              {(['characters', 'locations', 'props', 'styles'].includes(scenePickerTab)) && (() => {
                const typeMap: Record<string, StoryboardResourceType> = { characters: 'actors', locations: 'locations', props: 'props', styles: 'moodboards' }
                const resources = data.resources[typeMap[scenePickerTab]] || []
                return resources.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '3rem 0', fontSize: '0.85rem' }}>No {scenePickerTab} found in the storyboard.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {resources.map(res => (
                      <div key={res.id} style={(() => { const sel = sceneSelections.some(s => s.startsWith(`${scenePickerTab}: ${res.name} [`)); return { background: sel ? 'rgba(64,255,156,0.06)' : 'rgba(255,255,255,0.015)', backdropFilter: 'blur(12px)', border: sel ? '1px solid rgba(64,255,156,0.35)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '0.8rem', overflow: 'hidden' as const, transition: 'all 0.25s', boxShadow: sel ? '0 0 12px rgba(64,255,156,0.15)' : 'none' } })()}>
                        {/* Card image */}
                        {res.media[0] && (
                          <button type="button" onClick={() => { const v = `${scenePickerTab}: ${res.name} [card] ${res.media[0].url}`; setSceneSelections(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]) }} style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', position: 'relative' }}>
                            <img src={res.media[0].url} alt={res.name} loading="lazy" style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
                          </button>
                        )}
                        <div style={{ padding: '0.6rem' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem' }}>{res.name}</div>
                          {res.description && <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.3, marginBottom: '0.4rem' }}>{res.description.substring(0, 60)}</div>}
                          {/* Sheet / projections */}
                          {res.sheetMedia.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                              {res.sheetMedia.map(sm => (
                                <button key={sm.id} type="button" onClick={() => { const v = `${scenePickerTab}: ${res.name} [projection] ${sm.url}`; setSceneSelections(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]) }} style={{ width: '36px', height: '36px', background: sceneSelections.some(s => s.includes(sm.url)) ? 'rgba(64,255,156,0.15)' : 'rgba(0,0,0,0.3)', border: sceneSelections.some(s => s.includes(sm.url)) ? '1px solid rgba(64,255,156,0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '2px', cursor: 'pointer', overflow: 'hidden' }}>
                                  <img src={sm.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '3px' }} />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
              {/* Upload from computer */}
              {scenePickerTab === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '1rem' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Upload any reference file (image, video, audio)</p>
                  <label style={{ padding: '0.6rem 1.5rem', borderRadius: '2rem', border: '1px solid rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.08)', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}>
                    Choose Files
                    <input type="file" accept="image/*,video/*,audio/*" multiple style={{ display: 'none' }} onChange={async (e) => {
                      const files = e.target.files; if (!files || files.length === 0) return;
                      const newSelections: string[] = [...sceneSelections];
                      for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const formData = new FormData(); formData.append('file', file);
                        try {
                          const resp = await fetch('/api/storyboard/upload', { method: 'POST', body: formData });
                          const result = await resp.json();
                          if (result.url) newSelections.push(`upload: ${file.name} ${result.url}`);
                        } catch { }
                      }
                      setSceneSelections(newSelections);
                    }} />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {blueprintSaveModal && (
        <div className="processing-overlay glass" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}>
          <form className="glass" onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const newBlueprint = {
              id: `bp-${Date.now()}`,
              title: formData.get('title') as string,
              prompt: blueprintSaveModal.prompt,
              sceneHint: blueprintSaveModal.sceneHint,
              skillHint: blueprintSaveModal.skillHint,
              summary: formData.get('summary') as string
            }
            setSavedBlueprints([newBlueprint, ...savedBlueprints])
            fetch('/api/blueprints/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBlueprint) }).catch(() => {})
            setBlueprintSaveModal(null)
          }} style={{ padding: '2rem', width: '450px', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(10,15,25,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: 0, color: 'var(--gold)', fontSize: '1.2rem', fontFamily: '"Outfit", sans-serif' }}>Save Blueprint</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>Blueprint Name</label>
              <input name="title" type="text" placeholder="e.g. Master Shot 01..." defaultValue={blueprintSaveModal.title || ''} style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', fontSize: '1rem' }} required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>Summary</label>
              <textarea name="summary" placeholder="Describe the purpose of this blueprint..." style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', minHeight: '80px', fontSize: '0.9rem', lineHeight: '1.4' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setBlueprintSaveModal(null)} style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '2rem', cursor: 'pointer', transition: 'all 0.2s' }}>Cancel</button>
              <button type="submit" style={{ padding: '0.6rem 1.5rem', background: 'var(--gold)', border: 'none', color: '#000', borderRadius: '2rem', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>Save Blueprint</button>
            </div>
          </form>
        </div>
      )}

      <div className="media-tabs">
        <button className={`media-tab icon-tab golden ${mediaTab === 'images' ? 'is-active' : ''}`} onClick={() => setMediaTab('images')} title="Image Tasks">
          <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 10.5l-3-3.8-4 5.3h14l-4-5.3z" fill="currentColor" /></svg>
        </button>
        <button className={`media-tab icon-tab golden ${mediaTab === 'videos' ? 'is-active' : ''}`} onClick={() => setMediaTab('videos')} title="Video Tasks">
          <svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor" /></svg>
        </button>
      </div>

      <div className="mindmap-composer">
        <div className="mindmap-main-node task-form-glass" style={{ flex: 2, padding: '1.2rem 2rem' }}>
          {/* Composer Tabs: Agent / Task / Builder — colored */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {([
              { key: 'agent', label: 'Agent', color: '#d4af37', d: 'M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z' },
              { key: 'task', label: 'Task', color: '#4ade80', d: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6M9 14l2 2 4-4' },
              { key: 'promptBuilder', label: 'Builder', color: '#60a5fa', d: 'M12 3l1.912 5.813L20 10.5l-4.587 3.979L16.978 21 12 17.5 7.022 21l1.565-6.521L4 10.5l6.088-1.687L12 3' }
            ] as const).map(tab => {
              const active = composerTab === tab.key;
              return (
                <button key={tab.key} type="button" onClick={() => setComposerTab(tab.key as any)} style={{ padding: '0.5rem 1.1rem', borderRadius: '0.7rem', border: active ? `1px solid ${tab.color}66` : '1px solid rgba(255,255,255,0.06)', background: active ? `${tab.color}14` : 'rgba(255,255,255,0.015)', backdropFilter: 'blur(8px)', color: active ? tab.color : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.25s', boxShadow: active ? `0 0 10px ${tab.color}20` : 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={tab.d} /></svg>
                  {tab.label}
                </button>
              )
            })}
          </div>

          {composerTab === 'agent' ? (
            /* AGENT CHAT — scrollable like ChatGPT */
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '480px', maxHeight: '600px', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '0.75rem', overflow: 'hidden' }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)' }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)' }}
              onDrop={async (e) => {
                e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                const file = e.dataTransfer.files?.[0]; if (!file) return;
                setAgentLoading(true);
                if (file.type.startsWith('image/')) {
                  const reader = new FileReader(); reader.onload = async () => {
                    const result = await chatWithAgent(`I dropped an image "${file.name}". What can you tell me about it?`, agentHistory, `User dropped image file: ${file.name}`);
                    if (!result.error) setAgentHistory(result.updatedHistory);
                    setAgentLoading(false);
                  }; reader.readAsDataURL(file);
                } else {
                  const text = await file.text();
                  const preview = text.substring(0, 2000);
                  const result = await chatWithAgent(`I dropped a file "${file.name}". Please review it.`, agentHistory, `File "${file.name}" content:\n${preview}`);
                  if (!result.error) setAgentHistory(result.updatedHistory);
                  setAgentLoading(false);
                }
              }}>
              {/* Attached context bar */}
              {(draft.sceneHint || draft.skillHint || (activePdf && pdfPages.length > 0)) && <div style={{ padding: '0.4rem 0.8rem', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>📎 Theo sees: {draft.sceneHint ? `scene refs (${draft.sceneHint.split(' | ').length})` : ''}{draft.sceneHint && draft.skillHint ? ', ' : ''}{draft.skillHint ? `skill: ${draft.skillHint}` : ''}{activePdf && pdfPages.length > 0 ? `${draft.sceneHint || draft.skillHint ? ', ' : ''}doc: ${activePdf}${(pdfMarkers[activePdf] || []).length > 0 ? ` (${(pdfMarkers[activePdf] || []).length} marks)` : ' (full)'}` : ''}</div>}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {agentHistory.length === 0 && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', flexDirection: 'column', gap: '0.5rem' }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" /></svg><span>Ask Theo anything about your project...</span></div>}
                {agentHistory.map((msg, i) => (
                  <div key={i} style={{ padding: '0.6rem 0.8rem', borderRadius: '0.6rem', fontSize: '0.82rem', lineHeight: '1.5', background: msg.role === 'user' ? 'rgba(96,165,250,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${msg.role === 'user' ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.04)'}`, color: msg.role === 'user' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', whiteSpace: 'pre-wrap', position: 'relative' }}
                    onMouseUp={(e) => {
                      if (msg.role !== 'model') return;
                      const sel = window.getSelection();
                      const text = sel?.toString().trim();
                      const bubble = e.currentTarget;
                      const existing = bubble.querySelector('.send-to-task-btn') as HTMLElement;
                      if (existing) existing.remove();
                      if (text && text.length > 10) {
                        const btn = document.createElement('button');
                        btn.className = 'send-to-task-btn';
                        btn.innerHTML = '📋 Send to Task';
                        Object.assign(btn.style, { position: 'absolute', top: '-28px', right: '8px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(212,175,55,0.4)', background: 'rgba(20,20,30,0.92)', color: '#d4af37', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer', zIndex: '99', backdropFilter: 'blur(8px)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', transition: 'all 0.2s' });
                        btn.onclick = () => {
                          onDraftChange({ title: `Task ${tasks.length + 1}`, prompt: text, sceneHint: draft.sceneHint || '', skillHint: draft.skillHint || '' });
                          setTimeout(() => onAdd(), 50);
                          btn.remove();
                        };
                        bubble.appendChild(btn);
                        setTimeout(() => { if (btn.parentNode) btn.remove(); }, 8000);
                      }
                    }}>
                    {msg.parts[0].text}
                  </div>
                ))}
              </div>
              <div style={{ padding: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '0.4rem', alignItems: 'stretch' }}>
                <textarea placeholder="Ask Theo anything... (Shift+Enter for newline)" value={agentInput} onChange={e => setAgentInput(e.target.value)} onKeyDown={async (e) => {
                  if (e.key === 'Enter' && !e.shiftKey && agentInput.trim()) {
                    e.preventDefault(); const msg = agentInput; setAgentInput(''); setAgentLoading(true);
                    const ctxParts: string[] = []; if (draft.sceneHint) ctxParts.push(`Scene assets: ${draft.sceneHint}`);
                    if (draft.skillHint) { for (const sn of draft.skillHint.split(' | ')) { try { const sk = availableSkills.find((s: any) => s.name === sn); if (sk) { const r = await fetch('/api/skills/read-md', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sk.id }) }); const d = await r.json(); ctxParts.push(`Skill "${sn}":\n${(d.content || sk.fullText || sk.description || '').substring(0, 40000)}`); } } catch { } } }
                    if (activePdf && pdfPages.length > 0) { const marks = pdfMarkers[activePdf] || []; if (marks.length > 0) { const excerpts = marks.map(m => pdfPages[m.page]?.slice(m.startIdx, m.endIdx)).filter(Boolean); ctxParts.push(`Doc "${activePdf}" marked:\n${excerpts.join('\n---\n')}`); } else if (pdfPages.join('').length < 3000) { ctxParts.push(`Doc "${activePdf}":\n${pdfPages.join('\n')}`); } }
                    const result = await chatWithAgent(msg, agentHistory, ctxParts.length > 0 ? ctxParts.join('\n\n') : undefined);
                    if (!result.error) setAgentHistory(result.updatedHistory); setAgentLoading(false);
                  }
                }} rows={2} style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '0.5rem 0.8rem', color: 'white', fontSize: '0.82rem', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, minHeight: '76px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '130px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button type="button" title="Voice" onClick={() => {
                      if (isRecording && recognitionRef.current) { recognitionRef.current.stop(); setIsRecording(false); return }
                      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!SR) return;
                      const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = 'en-US';
                      r.onresult = (ev: any) => { let t = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) t += ev.results[i][0].transcript; if (ev.results[ev.results.length - 1].isFinal) setAgentInput(p => p + ' ' + t) };
                      r.onerror = () => setIsRecording(false); r.onend = () => setIsRecording(false);
                      r.start(); recognitionRef.current = r; setIsRecording(true);
                    }} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.4rem', border: isRecording ? '1px solid #ff2a55' : '1px solid rgba(255,255,255,0.12)', background: isRecording ? 'rgba(255,42,85,0.15)' : 'transparent', color: isRecording ? '#ff2a55' : 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
                    </button>
                    <label style={{ flex: 1, padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'grid', placeItems: 'center' }} title="Attach">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                      <input type="file" style={{ display: 'none' }} onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return; setAgentLoading(true);
                        const text = await file.text();
                        const result = await chatWithAgent(`Please review my file "${file.name}".`, agentHistory, `File "${file.name}":\n${text.substring(0, 2000)}`);
                        if (!result.error) setAgentHistory(result.updatedHistory); setAgentLoading(false);
                      }} />
                    </label>
                  </div>
                  <button type="button" disabled={agentLoading || !agentInput.trim()} onClick={async () => {
                    const msg = agentInput; setAgentInput(''); setAgentLoading(true);
                    const ctxParts: string[] = []; if (draft.sceneHint) ctxParts.push(`Scene assets: ${draft.sceneHint}`);
                    if (draft.skillHint) { for (const sn of draft.skillHint.split(' | ')) { try { const sk = availableSkills.find((s: any) => s.name === sn); if (sk) { const r = await fetch('/api/skills/read-md', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sk.id }) }); const d = await r.json(); ctxParts.push(`Skill "${sn}":\n${(d.content || sk.fullText || sk.description || '').substring(0, 40000)}`); } } catch { } } }
                    if (activePdf && pdfPages.length > 0) { const marks = pdfMarkers[activePdf] || []; if (marks.length > 0) { const excerpts = marks.map(m => pdfPages[m.page]?.slice(m.startIdx, m.endIdx)).filter(Boolean); ctxParts.push(`Doc "${activePdf}" marked:\n${excerpts.join('\n---\n')}`); } else if (pdfPages.join('').length < 3000) { ctxParts.push(`Doc "${activePdf}":\n${pdfPages.join('\n')}`); } }
                    const result = await chatWithAgent(msg, agentHistory, ctxParts.length > 0 ? ctxParts.join('\n\n') : undefined);
                    if (!result.error) setAgentHistory(result.updatedHistory); setAgentLoading(false);
                  }} style={{ width: '100%', padding: '0.55rem', borderRadius: '0.45rem', border: '1.5px solid rgba(96,165,250,0.5)', background: 'transparent', color: agentLoading ? 'rgba(96,165,250,0.4)' : 'rgba(96,165,250,0.95)', cursor: agentLoading ? 'wait' : 'pointer', fontSize: '0.82rem', fontWeight: 600, flex: 1, letterSpacing: '0.03em' }}>
                    {agentLoading ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          ) : composerTab === 'task' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <textarea placeholder="Write the highly detailed task for the agent. Specify framing, lighting, motion, and exact skills..." value={draft.prompt} onChange={(event) => onDraftChange({ ...draft, prompt: event.target.value })} className="node-prompt-input" style={{ minHeight: '300px' }} />
              <button type="button" disabled={agentLoading || !draft.prompt.trim()} onClick={async () => {
                setAgentLoading(true); const result = await generatePrompt(draft.title || 'scene', 'cinematic Pixar 3D animation, AAA quality, ' + draft.prompt.substring(0, 200));
                if (!result.error) onDraftChange({ ...draft, prompt: result.text }); setAgentLoading(false);
              }} style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.05)', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.2s', alignSelf: 'flex-start' }}>
                {agentLoading ? '⏳ Enhancing...' : '✨ Enhance with AI'}
              </button>
            </div>
          ) : (
            <div className="prompt-builder-panel" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '1.5rem', minHeight: '350px', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <p style={{ color: 'var(--gold)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.5rem 0', fontWeight: 600 }}>Style Starter</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {['Cinematic Pixar 3D, depth of field', 'Anime cel-shaded, vibrant', 'Photorealistic 8K, natural lighting', 'Watercolor illustration, soft edges', 'Dark cinematic noir, high contrast'].map(s => (
                    <button key={s} type="button" onClick={() => onDraftChange({ ...draft, prompt: s + ', ' + draft.prompt })} style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s' }}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ color: 'var(--gold)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.5rem 0', fontWeight: 600 }}>Camera</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {['35mm f/1.4 shallow DOF', '85mm portrait lens', '24mm wide angle', '200mm telephoto', 'Anamorphic 2.39:1', 'Drone aerial shot', 'Steadicam tracking', 'Dutch angle', 'Low angle hero shot', 'Close-up macro'].map(c => (
                    <button key={c} type="button" onClick={() => onDraftChange({ ...draft, prompt: draft.prompt + ', ' + c })} style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s' }}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ color: 'var(--gold)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.5rem 0', fontWeight: 600 }}>End Paragraph</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {['volumetric lighting, lens flare, cinematic color grading', 'subsurface scattering, true depth of field, AAA quality', '2x2 grid of 4 variations, different angles', 'character turnaround sheet, front/side/back/3-4 view', 'same composition as @img1, improve quality only'].map(e => (
                    <button key={e} type="button" onClick={() => onDraftChange({ ...draft, prompt: draft.prompt + '. ' + e })} style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s' }}>{e}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 'auto', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', lineHeight: '1.4', maxHeight: '100px', overflowY: 'auto' }}>
                <strong style={{ color: 'var(--gold)' }}>Preview:</strong> {draft.prompt || 'Click chunks above to build your prompt...'}
              </div>
              <button type="button" disabled={agentLoading || !draft.prompt.trim()} onClick={async () => {
                setAgentLoading(true); const result = await refinePrompt(draft.prompt, 'Make it more cinematic, add specific camera lens, lighting, and quality boosters');
                if (!result.error) onDraftChange({ ...draft, prompt: result.text }); setAgentLoading(false);
              }} style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.05)', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.2s', alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                {agentLoading ? '⏳ Refining...' : '✨ AI Refine Prompt'}
              </button>
            </div>
          )}

          {/* Attachment strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap', minHeight: '60px' }}>
            {draft.sceneHint && draft.sceneHint.split(' | ').map((s, i) => {
              const cat = s.split(':')[0]?.toLowerCase().trim() || 'images'
              const iconMap: Record<string, { color: string, d: string }> = {
                images: { color: '#d4af37', d: 'M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
                videos: { color: '#f59e0b', d: 'M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z' },
                characters: { color: '#60a5fa', d: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z' },
                locations: { color: '#4ade80', d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0zM15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
                props: { color: '#f472b6', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
                styles: { color: '#a78bfa', d: 'M7 21a4 4 0 0 1-4-4V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v12a4 4 0 0 1-4 4zm0 0h12a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2.343' }
              }
              const ic = iconMap[cat] || iconMap.images
              return (<div key={`s${i}`} className="att-chip" style={{ width: '52px', height: '52px', borderRadius: '0.5rem', border: `1px solid ${ic.color}44`, background: `${ic.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }} title={s}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={ic.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={ic.d} /></svg>
                <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '14px', height: '14px', borderRadius: '50%', background: ic.color, color: '#000', fontSize: '0.55rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                <button type="button" onClick={(e) => { e.stopPropagation(); const parts = draft.sceneHint.split(' | ').filter((_, j) => j !== i); onDraftChange({ ...draft, sceneHint: parts.join(' | ') }) }} className="att-del" style={{ position: 'absolute', top: '-5px', left: '-5px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(255,60,60,0.9)', border: 'none', color: 'white', fontSize: '0.6rem', fontWeight: 700, display: 'none', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>×</button>
              </div>)
            })}
            {draft.skillHint && draft.skillHint.split(' | ').map((sn, si) => (
              <div key={`sk${si}`} className="att-chip" style={{ width: '52px', height: '52px', borderRadius: '0.5rem', border: '1px solid rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }} title={sn}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" /><line x1="9" y1="21" x2="15" y2="21" /></svg>
                <button type="button" onClick={() => { const remaining = draft.skillHint.split(' | ').filter((_, j) => j !== si).join(' | '); onDraftChange({ ...draft, skillHint: remaining }) }} className="att-del" style={{ position: 'absolute', top: '-5px', left: '-5px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(255,60,60,0.9)', border: 'none', color: 'white', fontSize: '0.6rem', fontWeight: 700, display: 'none', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>×</button>
              </div>
            ))}
            {activePdf && pdfPages.length > 0 && (
              <div className="att-chip" style={{ width: '52px', height: '52px', borderRadius: '0.5rem', border: '1px solid rgba(255,96,64,0.3)', background: 'rgba(255,96,64,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }} title={activePdf} onClick={() => setShowPdfViewer(true)}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ff6040" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                {(pdfMarkers[activePdf] || []).length > 0 && <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '14px', height: '14px', borderRadius: '50%', background: '#ff6040', color: '#fff', fontSize: '0.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{(pdfMarkers[activePdf] || []).length}</div>}
              </div>
            )}
          </div>
          <div className="node-footer" style={{ padding: '0.3rem 0 0 0' }}>
            <button className="execute-task-btn" onClick={onAdd} type="button">
              Launch Pipeline <span>⚡️</span>
            </button>
          </div>
        </div>

        <div className="mindmap-attachment-nodes" style={{ flex: 1, gap: '1rem', display: 'flex', flexDirection: 'column', marginTop: '-0.5rem' }}>
          <div className="attachment-node glass scene-node" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', padding: '1.2rem 1.5rem', borderRadius: '1rem', width: '100%', minHeight: '120px' }}>
            <p className="eyebrow">Target Scene</p>
            <input placeholder={draft.sceneHint && draft.sceneHint.includes(' | ') ? `Multiple (${draft.sceneHint.split(' | ').length}) attached` : 'e.g. Act 1 Scene 2'} value={draft.sceneHint && draft.sceneHint.includes(' | ') ? '' : draft.sceneHint} onChange={(event) => onDraftChange({ ...draft, sceneHint: event.target.value })} style={{ color: draft.sceneHint && draft.sceneHint.includes(' | ') ? 'rgba(255,255,255,0.3)' : undefined }} readOnly={!!(draft.sceneHint && draft.sceneHint.includes(' | '))} />

            <button className="attach-btn" type="button" onClick={() => setIsModalOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ verticalAlign: 'middle', marginRight: '0.4rem' }}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              Link Visual Node
            </button>
          </div>
          <div className="attachment-node glass skill-node" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', padding: '1.2rem 1.5rem', borderRadius: '1rem', width: '100%', minHeight: '120px' }}>
            <p className="eyebrow">Agent Skills</p>
            {draft.skillHint && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.7rem', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '0.5rem', marginBottom: '0.5rem', fontSize: '0.82rem', color: 'var(--gold)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                {draft.skillHint.includes(' | ') ? `Multiple selected (${draft.skillHint.split(' | ').length})` : draft.skillHint}
                <button type="button" onClick={() => onDraftChange({ ...draft, skillHint: '' })} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>×</button>
              </div>
            )}
            <button className="attach-btn" type="button" onClick={() => setShowSkillsStore(true)} style={{ textAlign: 'center', display: 'block', width: '100%', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ verticalAlign: 'middle', marginRight: '0.4rem' }}><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" /><line x1="9" y1="21" x2="15" y2="21" /></svg>
              Browse Skills Store
            </button>
          </div>
          {/* References & PDFs — bookstore icons */}
          <div className="attachment-node glass ref-node" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', padding: '1.2rem 1.5rem', borderRadius: '1rem', width: '100%', minHeight: '120px' }}>
            <p className="eyebrow">References & PDFs</p>
            {pdfDocs.filter(d => d.pinned).length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                {pdfDocs.filter(d => d.pinned).map(doc => (
                  <button key={doc.name} type="button" onClick={() => { setActivePdf(doc.name); setShowPdfViewer(true) }} style={{ width: '52px', height: '62px', borderRadius: '0.5rem', border: activePdf === doc.name ? '1px solid rgba(255,96,64,0.5)' : '1px solid rgba(255,255,255,0.08)', background: activePdf === doc.name ? 'rgba(255,96,64,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', transition: 'all 0.25s', boxShadow: activePdf === doc.name ? '0 0 10px rgba(255,96,64,0.15)' : 'none' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activePdf === doc.name ? '#ff6040' : 'rgba(255,255,255,0.35)'} strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                    <span style={{ fontSize: '0.5rem', color: activePdf === doc.name ? '#ff6040' : 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.1, overflow: 'hidden', maxWidth: '46px' }}>{doc.name.replace(/\.(pdf|docx|pages)$/i, '').substring(0, 10)}</span>
                  </button>
                ))}
              </div>
            )}
            <button className="attach-btn" type="button" onClick={() => { fetch('/api/docs/list').then(r => r.json()).then(d => setPdfDocs(d.docs || [])).catch(() => { }); setShowPdfViewer(true) }} style={{ textAlign: 'center', display: 'block', width: '100%', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ verticalAlign: 'middle', marginRight: '0.4rem' }}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
              Open Document Viewer
            </button>
          </div>
        </div>
      </div>
      <div className="agent-pipeline-board">
        <div className="pipeline-tabs">
          <button className={`pipeline-tab ${activeTab === 'tasks' ? 'is-active' : ''}`} onClick={() => setActiveTab('tasks')}>
            Tasks ({tasks.filter(t => t.status === 'todo' || t.status === 'todo_working' || t.status === 'done' || (t.status as any) === 'completed').length})
          </button>
          <button className={`pipeline-tab ${activeTab === 'edit' ? 'is-active' : ''}`} onClick={() => setActiveTab('edit')}>
            Edit ({tasks.filter(t => t.status.startsWith('pass') || t.status === 'pass_working').length})
          </button>
          <button className={`pipeline-tab ${activeTab === 'archived' ? 'is-active' : ''}`} onClick={() => setActiveTab('archived')}>
            Archive ({tasks.filter(t => t.status === 'archived').length})
          </button>
        </div>

        <div className="pipeline-content">
          {activeTab === 'tasks' && (
            <>
              {/* Queue / Completed subtabs */}
              <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.2rem', padding: '0 0.5rem' }}>
                <button type="button" onClick={() => setTasksSubTab('queue')} style={{ padding: '0.4rem 1.2rem', borderRadius: '2rem', border: tasksSubTab === 'queue' ? '1px solid rgba(248,217,120,0.4)' : '1px solid rgba(255,255,255,0.08)', background: tasksSubTab === 'queue' ? 'rgba(248,217,120,0.08)' : 'transparent', color: tasksSubTab === 'queue' ? 'var(--gold)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s' }}>Queue ({tasks.filter(t => t.status === 'todo' || t.status === 'todo_working').length})</button>
                <button type="button" onClick={() => setTasksSubTab('completed')} style={{ padding: '0.4rem 1.2rem', borderRadius: '2rem', border: tasksSubTab === 'completed' ? '1px solid rgba(64,255,156,0.4)' : '1px solid rgba(255,255,255,0.08)', background: tasksSubTab === 'completed' ? 'rgba(64,255,156,0.08)' : 'transparent', color: tasksSubTab === 'completed' ? '#4ade80' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s' }}>Completed ({tasks.filter(t => ['done', 'completed', 'pass', 'pass_working'].includes(t.status as string)).length})</button>
              </div>
              {tasksSubTab === 'queue' && (
                <div className="todo-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', padding: '0 0.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button type="button" onClick={() => { setTaskSelectMode(!taskSelectMode); setSelectedTaskIds([]); }} style={{ padding: '0.4rem 1rem', borderRadius: '2rem', border: taskSelectMode ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.1)', background: taskSelectMode ? 'rgba(248, 217, 120, 0.08)' : 'transparent', color: taskSelectMode ? 'var(--gold)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M9 12l2 2 4-4"></path></svg>
                        {taskSelectMode ? 'Cancel' : 'Select'}
                      </button>
                      {taskSelectMode && <>
                        <button type="button" onClick={() => { const allIds = tasks.filter(t => t.status === 'todo' || t.status === 'todo_working').map(t => t.id); setSelectedTaskIds(prev => prev.length === allIds.length ? [] : allIds); }} style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.72rem' }}>{selectedTaskIds.length === tasks.filter(t => t.status === 'todo' || t.status === 'todo_working').length ? 'Deselect All' : 'Select All'}</button>
                        {selectedTaskIds.length > 0 && <>
                          <button type="button" onClick={() => { selectedTaskIds.forEach(id => { onTaskChange(id, draft => { draft.status = 'archived' }); fetch('/api/tasks/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {}); }); setSelectedTaskIds([]); setTaskSelectMode(false); }} style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid rgba(248,217,120,0.3)', background: 'rgba(248,217,120,0.08)', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Archive {selectedTaskIds.length}</button>
                          <button type="button" onClick={() => { selectedTaskIds.forEach(id => { onTaskChange(id, draft => { draft.status = 'archived' }); fetch('/api/tasks/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {}); }); setSelectedTaskIds([]); setTaskSelectMode(false); }} style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid rgba(255,42,85,0.3)', background: 'rgba(255,42,85,0.08)', color: '#ff2a55', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Delete {selectedTaskIds.length}</button>
                        </>}
                      </>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', padding: '0 0.5rem' }}>
                    <button type="button" onClick={() => setShowBlueprintGallery(!showBlueprintGallery)} style={{ background: 'rgba(248, 217, 120, 0.1)', color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: '2rem', padding: '0.5rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.2s' }} className="queue-action-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      {showBlueprintGallery ? 'Close Blueprints' : 'Blueprints'}
                    </button>
                  </div>
                  {showBlueprintGallery ? (
                    <>
                      <div className="pipeline-grid blueprint-open">
                        <div className="queue-cards-section" onClick={() => setShowBlueprintGallery(false)}>
                          {tasks.filter(t => t.status === 'todo' || t.status === 'todo_working').slice(0, 4).map(task => (
                            <TaskNode data={data} key={task.id} task={task} onTaskChange={onTaskChange} onAssignAsset={onAssignAsset} onEditTask={(t) => { onDraftChange({ title: t.title, sceneHint: t.sceneHint, skillHint: t.skillHint, prompt: t.prompt }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onSaveBlueprint={(t) => setBlueprintSaveModal(t)} />
                          ))}
                        </div>
                        <article className="agent-task-card glass blueprint-library">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--gold)', fontSize: '1.1rem', fontWeight: 600, fontFamily: '"Outfit", sans-serif' }}>Saved Blueprints</h3>
                            <div style={{ position: 'relative' }}>
                              <input type="text" placeholder="Search..." style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2rem', padding: '0.4rem 0.5rem 0.4rem 2rem', color: 'white', width: '120px', fontSize: '0.8rem' }} />
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                          </div>
                          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingRight: '0.5rem' }}>
                            {savedBlueprints.map(bp => (
                              <button key={bp.id} className="blueprint-item" onClick={() => { onDraftChange({ title: bp.title, prompt: bp.prompt, sceneHint: bp.sceneHint, skillHint: bp.skillHint }); setShowBlueprintGallery(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', textAlign: 'left', padding: '1rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                <div style={{ fontWeight: 600, color: 'var(--gold)' }}>{bp.title}</div>
                                {bp.summary && <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.4rem', lineHeight: '1.4' }}>{bp.summary}</div>}
                              </button>
                            ))}
                          </div>
                        </article>
                      </div>
                      {tasks.filter(t => t.status === 'todo' || t.status === 'todo_working').length > 4 && (
                        <div className="pipeline-grid" style={{ marginTop: '1.5rem' }}>
                          {tasks.filter(t => t.status === 'todo' || t.status === 'todo_working').slice(4).map(task => (
                            <TaskNode data={data} key={task.id} task={task} onTaskChange={onTaskChange} onAssignAsset={onAssignAsset} onEditTask={(t) => { onDraftChange({ title: t.title, sceneHint: t.sceneHint, skillHint: t.skillHint, prompt: t.prompt }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onSaveBlueprint={(t) => setBlueprintSaveModal(t)} />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="pipeline-grid">
                      {tasks.filter(t => t.status === 'todo' || t.status === 'todo_working').map(task => (
                        <TaskNode data={data} key={task.id} task={task} onTaskChange={onTaskChange} onAssignAsset={onAssignAsset} onEditTask={(t) => { onDraftChange({ title: t.title, sceneHint: t.sceneHint, skillHint: t.skillHint, prompt: t.prompt }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onSaveBlueprint={(t) => setBlueprintSaveModal(t)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tasksSubTab === 'completed' && (
                <div className="completed-container">
                  <div className="pipeline-grid">
                    {tasks.filter(t => ['done', 'completed', 'pass', 'pass_working'].includes(t.status as string)).length === 0 ? (
                      <div className="empty-state" style={{ color: 'rgba(255,255,255,0.5)', padding: '2rem', textAlign: 'center', gridColumn: '1/-1' }}>No completed tasks yet. Tasks move here automatically after generation finishes.</div>
                    ) : tasks.filter(t => ['done', 'completed', 'pass', 'pass_working'].includes(t.status as string)).map(task => (
                      <article key={task.id} className="agent-task-card glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', height: '220px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '1rem', fontFamily: '"Outfit", sans-serif', lineHeight: 1.3 }} onDoubleClick={() => { const newName = prompt('Rename task:', task.title); if (newName && newName.trim()) onTaskChange(task.id, d => { d.title = newName.trim() }) }}>{task.title}</div>
                          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', whiteSpace: 'nowrap', paddingTop: '0.2rem' }}>{new Date(task.updatedAt).toLocaleDateString()}</div>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{task.prompt}</div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxHeight: '60px', overflowY: 'auto', scrollbarWidth: 'thin' as any }}>
                          {task.sceneHint && <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(95,189,255,0.1)', color: '#7edbff', borderRadius: '4px', border: '1px solid rgba(95,189,255,0.2)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.sceneHint}>{task.sceneHint.length > 80 ? task.sceneHint.substring(0, 80) + '…' : task.sceneHint}</span>}
                          {task.skillHint && <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(183,142,255,0.1)', color: '#c7b8ff', borderRadius: '4px', border: '1px solid rgba(183,142,255,0.2)' }}>{task.skillHint}</span>}
                          {task.passes && task.passes.length > 0 && <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', borderRadius: '4px' }}>{task.passes.length} pass{task.passes.length > 1 ? 'es' : ''} • {task.passes.reduce((n, p) => n + (p.images?.length || 0), 0)} images</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', justifyContent: 'flex-end' }}>
                          <button type="button" title="Edit in Composer" onClick={() => { onDraftChange({ title: task.title, sceneHint: task.sceneHint, skillHint: task.skillHint, prompt: task.prompt }); setActiveTab('tasks'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ padding: '0.4rem 1rem', borderRadius: '2rem', border: '1px solid rgba(248,217,120,0.3)', background: 'rgba(248,217,120,0.05)', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Edit</button>
                          <button type="button" title="Reopen" onClick={() => { onTaskChange(task.id, draft => { draft.status = 'todo' }); }} style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.75rem' }}>Reopen</button>
                          <button type="button" title="Archive" onClick={() => { onTaskChange(task.id, draft => { draft.status = 'archived' }); fetch('/api/tasks/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id }) }).catch(() => {}); }} style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid rgba(255,42,85,0.2)', background: 'transparent', color: 'rgba(255,42,85,0.6)', cursor: 'pointer', fontSize: '0.75rem' }}>Archive</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {activeTab === 'edit' && (
            <div className="edit-container" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="task-horizontal-tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
                {tasks.filter(t => t.status.startsWith('pass') || t.status === 'pass_working').map(task => {
                  const isActive = activeTaskIds['edit'] === task.id || (!activeTaskIds['edit'] && tasks.filter(t => t.status.startsWith('pass') || t.status === 'pass_working')[0]?.id === task.id);
                  return (
                    <button key={task.id} className="task-sub-tab" style={{ padding: '0.5rem 1.5rem', borderRadius: '2rem', border: isActive ? '1px solid rgba(248, 217, 120, 0.5)' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: isActive ? 'rgba(248, 217, 120, 0.05)' : 'rgba(255,255,255,0.02)', color: isActive ? 'var(--gold)' : 'rgba(255,255,255,0.6)', boxShadow: isActive ? '0 0 12px rgba(248, 217, 120, 0.3)' : 'none', textShadow: isActive ? '0 0 8px rgba(248, 217, 120, 0.5)' : 'none', transition: 'all 0.3s ease' }} onClick={() => setActiveTaskIds({ ...activeTaskIds, edit: task.id })} onDoubleClick={(e) => { e.stopPropagation(); const newName = prompt('Rename task:', task.title); if (newName && newName.trim()) onTaskChange(task.id, d => { d.title = newName.trim() }) }}>
                      <div style={{ fontWeight: 600 }}>{task.title || 'Untitled Task'}</div>
                    </button>
                  );
                })}
              </div>
              <div className="task-content">
                {tasks.filter(t => t.status.startsWith('pass') || t.status === 'pass_working').find(t => t.id === activeTaskIds['edit']) ? (
                  <TaskNode data={data} key={activeTaskIds['edit']} task={tasks.filter(t => t.status.startsWith('pass') || t.status === 'pass_working').find(t => t.id === activeTaskIds['edit'])!} onTaskChange={onTaskChange} onAssignAsset={onAssignAsset} />
                ) : tasks.filter(t => t.status.startsWith('pass') || t.status === 'pass_working')[0] ? (
                  <TaskNode data={data} key={tasks.filter(t => t.status.startsWith('pass') || t.status === 'pass_working')[0].id} task={tasks.filter(t => t.status.startsWith('pass') || t.status === 'pass_working')[0]} onTaskChange={onTaskChange} onAssignAsset={onAssignAsset} />
                ) : (
                  <div className="empty-state" style={{ color: 'rgba(255,255,255,0.5)', padding: '2rem', textAlign: 'center' }}>No active tasks in edit mode.</div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'archived' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
                <h3 style={{ color: 'var(--gold)', margin: 0, fontWeight: 500, fontFamily: '"Outfit", sans-serif' }}>
                  Archived Tasks ({tasks.filter(t => t.status === 'archived').filter(t => !archiveSearch || t.title.toLowerCase().includes(archiveSearch.toLowerCase())).length})
                </h3>
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="Search archive..." value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2rem', padding: '0.5rem 0.8rem 0.5rem 2.2rem', color: 'white', width: '200px', fontSize: '0.85rem' }} />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
              </div>
              <div className="pipeline-grid">
                {tasks.filter(t => t.status === 'archived').filter(t => !archiveSearch || t.title.toLowerCase().includes(archiveSearch.toLowerCase())).map(task => (
                  <TaskNode data={data} key={task.id} task={task} onTaskChange={onTaskChange} onSaveBlueprint={(t) => setBlueprintSaveModal(t)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SKILLS STORE MODAL */}
      {showSkillsStore && (() => {
        const SKILL_SVGS = [
          { color: '#d4af37', d: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
          { color: '#409cff', d: 'M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83' },
          { color: '#9c40ff', d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' },
          { color: '#40ff9c', d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
          { color: '#ff9c40', d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z' },
          { color: '#ff4090', d: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
          { color: '#40ffff', d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22V15' },
          { color: '#ffc840', d: 'M12 3v18M3 12h18M7.5 7.5l9 9M16.5 7.5l-9 9' },
          { color: '#a0ff40', d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3' },
          { color: '#ff6040', d: 'M13 2L3 14h9l-1 8 10-12h-9l1-8' },
        ]
        const getIcon = (idx: number) => SKILL_SVGS[idx % SKILL_SVGS.length]
        const usedIndices = availableSkills.map((_: any, i: number) => i % SKILL_SVGS.length)
        const getNewIconIdx = () => { for (let i = 0; i < 10; i++) { if (!usedIndices.includes(i)) return i } return Math.floor(Math.random() * 10) }
        return (
          <div className="skills-store-backdrop" onClick={() => setShowSkillsStore(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}>
            <div className="skills-store-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(90vw, 900px)', maxHeight: '85vh', background: 'linear-gradient(145deg, rgba(20,20,30,0.95), rgba(10,10,20,0.98))', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '1.5rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(212,175,55,0.08), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
              {/* Header with Tabs */}
              <div style={{ padding: '1.2rem 2rem 0', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(248,192,64,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" /><line x1="9" y1="21" x2="15" y2="21" /><line x1="10" y1="23" x2="14" y2="23" /></svg>
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontWeight: 700, letterSpacing: '-0.3px' }}>{dcStoreTab === 'skills' ? 'Skills Store' : 'Prompt Blueprints'}</h2>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>{availableSkills.length} skills available · <span style={{ color: 'rgba(212,175,55,0.6)' }}>public/assets/storyboard/skills/</span></p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowSkillsStore(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'rgba(255,255,255,0.5)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.2s' }}>✕</button>
                </div>
                <div style={{ display: 'flex', gap: '0.3rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {(['skills', 'prompts'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setDcStoreTab(t)} style={{ padding: '0.5rem 1.2rem', border: 'none', borderBottom: dcStoreTab === t ? '2px solid var(--gold)' : '2px solid transparent', background: 'none', color: dcStoreTab === t ? 'var(--gold)' : 'rgba(255,255,255,0.4)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>{t === 'skills' ? '⚡ Skills' : '📝 Prompts'}</button>
                  ))}
                </div>
              </div>

              {/* Content area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
              {dcStoreTab === 'skills' ? (<>
              {/* ── Skills Tab ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600, margin: 0 }}>Available Skills</p>
                  {(() => {
                    const totalPages = availableSkills.length <= 5 ? 1 : 1 + Math.ceil((availableSkills.length - 5) / 6); return totalPages > 1 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <button type="button" onClick={() => setSkillsPage(Math.max(0, skillsPage - 1))} disabled={skillsPage === 0} style={{ background: 'none', border: 'none', cursor: skillsPage === 0 ? 'default' : 'pointer', padding: '2px', opacity: skillsPage === 0 ? 0.15 : 0.5, transition: 'opacity 0.2s' }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button key={i} type="button" onClick={() => setSkillsPage(i)} style={{ width: '9px', height: '9px', borderRadius: '50%', border: 'none', background: i === skillsPage ? 'var(--gold)' : 'rgba(255,255,255,0.18)', boxShadow: i === skillsPage ? '0 0 8px rgba(212,175,55,0.6)' : 'none', cursor: 'pointer', padding: 0, transition: 'all 0.25s' }} />
                        ))}
                        <button type="button" onClick={() => setSkillsPage(Math.min(totalPages - 1, skillsPage + 1))} disabled={skillsPage >= totalPages - 1} style={{ background: 'none', border: 'none', cursor: skillsPage >= totalPages - 1 ? 'default' : 'pointer', padding: '2px', opacity: skillsPage >= totalPages - 1 ? 0.15 : 0.5, transition: 'opacity 0.2s' }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                      </div>
                    ) : null
                  })()}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                  {(() => { const p1Count = Math.min(availableSkills.length, 5); const pageSkills = skillsPage === 0 ? availableSkills.slice(0, p1Count) : availableSkills.slice(p1Count + (skillsPage - 1) * 6, p1Count + skillsPage * 6); return pageSkills })().map((skill, sliceIdx) => {
                    const idx = skillsPage === 0 ? sliceIdx : Math.min(availableSkills.length, 5) + (skillsPage - 1) * 6 + sliceIdx
                    const isSelected = draft.skillHint ? draft.skillHint.split(' | ').includes(skill.name) : false
                    const ic = getIcon(skill.iconIdx ?? idx)
                    return (
                      <div key={skill.id} className="skill-card-wrap" style={{ position: 'relative' }}
                        onMouseEnter={(e) => { const el = e.currentTarget; el.querySelector<HTMLElement>('.skill-actions')!.style.opacity = '1' }}
                        onMouseLeave={(e) => { const el = e.currentTarget; el.querySelector<HTMLElement>('.skill-actions')!.style.opacity = '0' }}>
                        {/* Delete + Edit overlay */}
                        <div className="skill-actions" style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', display: 'flex', gap: '0.3rem', zIndex: 2, opacity: 0, transition: 'opacity 0.2s' }}>
                          <button type="button" title="Edit" onClick={async (e) => { e.stopPropagation(); setEditingSkillId(skill.id); setNewSkillTitle(skill.name || ''); try { const r = await fetch('/api/skills/read-md', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: skill.id }) }); const d = await r.json(); setNewSkillText(d.content || skill.fullText || skill.description || '') } catch { setNewSkillText(skill.fullText || skill.description || '') } }} style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '0.65rem' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button type="button" title="Remove" onClick={(e) => { e.stopPropagation(); setAvailableSkills(prev => prev.filter(s => s.id !== skill.id)); if (draft.skillHint) { const remaining = draft.skillHint.split(' | ').filter(n => n !== skill.name).join(' | '); onDraftChange({ ...draft, skillHint: remaining }) } }} style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid rgba(255,80,80,0.3)', background: 'rgba(0,0,0,0.6)', color: 'rgba(255,80,80,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '0.75rem' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </div>
                        <button type="button" onClick={() => { const current = draft.skillHint ? draft.skillHint.split(' | ') : []; if (current.includes(skill.name)) { onDraftChange({ ...draft, skillHint: current.filter(n => n !== skill.name).join(' | ') }) } else { onDraftChange({ ...draft, skillHint: [...current, skill.name].join(' | ') }) } }} style={{ width: '100%', minHeight: '140px', background: isSelected ? `rgba(${parseInt(ic.color.slice(1, 3), 16)},${parseInt(ic.color.slice(3, 5), 16)},${parseInt(ic.color.slice(5, 7), 16)},0.08)` : 'rgba(255,255,255,0.015)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: `1px solid ${isSelected ? ic.color + '66' : 'rgba(255,255,255,0.06)'}`, borderRadius: '1rem', padding: '1.4rem 1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7rem', transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)', textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: isSelected ? `0 0 24px ${ic.color}33, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)` : '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)', transform: isSelected ? 'scale(1.04)' : 'scale(1)' }}>
                          {/* Floating light effect */}
                          <div style={{ position: 'absolute', bottom: '-30px', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '60px', borderRadius: '50%', background: `radial-gradient(ellipse, ${ic.color}18, transparent 70%)`, pointerEvents: 'none', filter: 'blur(8px)' }} />
                          {/* SVG Icon */}
                          <div style={{ width: isSelected ? '44px' : '36px', height: isSelected ? '44px' : '36px', transition: 'all 0.3s ease', filter: isSelected ? `drop-shadow(0 0 10px ${ic.color})` : 'none' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke={ic.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}><path d={ic.d} /></svg>
                          </div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: isSelected ? 'white' : 'rgba(255,255,255,0.75)', lineHeight: 1.3, letterSpacing: '-0.2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: '100%' }}>{skill.name}</div>
                          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{skill.description?.substring(0, 80) || ''}</div>
                          {isSelected && <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ic.color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg></div>}
                        </button>
                      </div>
                    )
                  })}
                  {/* Upload from computer — always visible on page 1 only */}
                  {skillsPage === 0 && (
                    <label style={{ background: 'rgba(255,255,255,0.015)', backdropFilter: 'blur(16px)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.4rem 1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7rem', transition: 'all 0.3s', textAlign: 'center' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>Upload Skills</div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>.json or .md (multiple)</div>
                      <input type="file" accept=".json,.md" multiple style={{ display: 'none' }} onChange={(e) => {
                        const files = e.target.files; if (!files) return;
                        const names: string[] = [];
                        Array.from(files).forEach(file => {
                          const reader = new FileReader()
                          reader.onload = () => {
                            try {
                              if (file.name.endsWith('.json')) {
                                const skill = JSON.parse(reader.result as string)
                                skill.iconIdx = getNewIconIdx()
                                fetch('/api/skills/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(skill) }).then(() => { setAvailableSkills(prev => [...prev, skill]); names.push(skill.name || file.name); })
                              } else { names.push(file.name); }
                            } catch { names.push(file.name); }
                          }
                          reader.readAsText(file)
                        })
                      }} />
                    </label>
                  )}
                </div>

                {/* Attach Selected button — visible when skills are selected */}
                {draft.skillHint && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '0.8rem 0' }}>
                    <button type="button" onClick={() => setShowSkillsStore(false)} style={{ padding: '0.6rem 2rem', borderRadius: '0.5rem', border: '1.5px solid rgba(96,165,250,0.5)', background: 'transparent', color: 'rgba(96,165,250,0.95)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.03em' }}>
                      Attach Selected ({draft.skillHint.split(' | ').length})
                    </button>
                  </div>
                )}

                {/* Create / Edit Skill Section */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.8rem', fontWeight: 600 }}>
                    {editingSkillId ? 'Edit Skill' : 'Create New Skill'}
                    {editingSkillId && <button type="button" onClick={() => { setEditingSkillId(null); setNewSkillTitle(''); setNewSkillText('') }} style={{ marginLeft: '0.8rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.7rem' }}>Cancel</button>}
                  </p>
                  <input value={newSkillTitle} onChange={(e) => setNewSkillTitle(e.target.value)} placeholder="Skill title (required)" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', color: 'white', padding: '0.6rem 1rem', fontSize: '0.85rem', marginBottom: '0.5rem', outline: 'none', fontFamily: 'inherit' }} />
                  <textarea value={newSkillText} onChange={(e) => setNewSkillText(e.target.value)} placeholder="Step-by-step instructions for the agent..." style={{ width: '100%', minHeight: '90px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', color: 'white', padding: '0.8rem 1rem', fontSize: '0.82rem', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, outline: 'none' }} />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Mic */}
                    <button type="button" onClick={() => {
                      if (skillRecording) { skillRecognitionRef.current?.stop(); setSkillRecording(false); return }
                      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
                      if (!SR) return
                      const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = 'en-US'
                      r.onresult = (ev: any) => { let t = ''; for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; setNewSkillText(t) }
                      r.onerror = () => setSkillRecording(false); r.onend = () => setSkillRecording(false)
                      r.start(); skillRecognitionRef.current = r; setSkillRecording(true)
                    }} style={{ padding: '0.45rem 0.8rem', borderRadius: '0.5rem', border: `1px solid ${skillRecording ? 'rgba(255,64,64,0.5)' : 'rgba(255,255,255,0.1)'}`, background: skillRecording ? 'rgba(255,64,64,0.12)' : 'rgba(255,255,255,0.03)', color: skillRecording ? '#ff6464' : 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></svg>
                      {skillRecording ? 'Stop' : 'Dictate'}
                    </button>
                    {/* AI Improve */}
                    <button type="button" disabled={aiImproving || !newSkillText.trim()} onClick={async () => {
                      if (!newSkillText.trim()) return
                      setAiImproving(true)
                      try {
                        const { sendToGemini } = await import('./gemini-agent')
                        const result = await sendToGemini(`Improve this skill description for an AI agent. Make it clear, well-structured with step-by-step instructions, and professional. Keep all technical details. Return ONLY the improved text:\n\n${newSkillText}`)
                        if (result.text) setNewSkillText(result.text)
                      } catch { } finally { setAiImproving(false) }
                    }} style={{ padding: '0.45rem 0.8rem', borderRadius: '0.5rem', border: '1px solid rgba(156,64,255,0.25)', background: 'rgba(156,64,255,0.06)', color: aiImproving ? 'rgba(200,160,255,0.5)' : 'rgba(200,160,255,0.75)', cursor: aiImproving ? 'wait' : 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" /></svg>
                      {aiImproving ? 'Improving...' : 'Improve with AI'}
                    </button>
                    {/* Spacer */}
                    <div style={{ flex: 1 }} />
                    {/* Edit mode: Save + Duplicate */}
                    {editingSkillId ? (<>
                      <button type="button" disabled={!newSkillTitle.trim()} onClick={async () => {
                        if (!newSkillTitle.trim()) return
                        const updated = { ...availableSkills.find(s => s.id === editingSkillId), name: newSkillTitle, description: newSkillText.substring(0, 200), fullText: newSkillText }
                        await fetch('/api/skills/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
                        setAvailableSkills(prev => prev.map(s => s.id === editingSkillId ? updated : s))
                        setEditingSkillId(null); setNewSkillTitle(''); setNewSkillText('')
                      }} style={{ padding: '0.45rem 0.8rem', borderRadius: '0.5rem', border: '1px solid rgba(64,156,255,0.3)', background: 'rgba(64,156,255,0.08)', color: !newSkillTitle.trim() ? 'rgba(64,156,255,0.3)' : 'rgba(120,180,255,0.85)', cursor: !newSkillTitle.trim() ? 'not-allowed' : 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /></svg>
                        Save
                      </button>
                      <button type="button" disabled={!newSkillTitle.trim()} onClick={async () => {
                        const slug = newSkillTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40)
                        const dup = { id: `skill-${slug || 'custom'}-${Date.now()}`, name: newSkillTitle, description: newSkillText.substring(0, 200), fullText: newSkillText, iconIdx: getNewIconIdx(), createdAt: new Date().toISOString() }
                        await fetch('/api/skills/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dup) })
                        setAvailableSkills(prev => [...prev, dup]); onDraftChange({ ...draft, skillHint: newSkillTitle })
                        setEditingSkillId(null); setNewSkillTitle(''); setNewSkillText('')
                      }} style={{ padding: '0.45rem 0.8rem', borderRadius: '0.5rem', border: '1px solid rgba(255,200,64,0.3)', background: 'rgba(255,200,64,0.08)', color: !newSkillTitle.trim() ? 'rgba(255,200,64,0.3)' : 'rgba(255,220,100,0.85)', cursor: !newSkillTitle.trim() ? 'not-allowed' : 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        Duplicate
                      </button>
                    </>) : (
                      <button type="button" disabled={!newSkillTitle.trim() || !newSkillText.trim()} onClick={async () => {
                        if (!newSkillTitle.trim() || !newSkillText.trim()) return
                        const slug = newSkillTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40)
                        const newSkill = { id: `skill-${slug || 'custom'}-${Date.now()}`, name: newSkillTitle.trim(), description: newSkillText.substring(0, 200), fullText: newSkillText, iconIdx: getNewIconIdx(), createdAt: new Date().toISOString() }
                        await fetch('/api/skills/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSkill) })
                        setAvailableSkills(prev => [...prev, newSkill]); onDraftChange({ ...draft, skillHint: newSkillTitle.trim() })
                        setNewSkillText(''); setNewSkillTitle(''); setShowSkillsStore(false)
                      }} style={{ padding: '0.45rem 0.8rem', borderRadius: '0.5rem', border: `1px solid ${(!newSkillTitle.trim() || !newSkillText.trim()) ? 'rgba(64,255,156,0.15)' : 'rgba(64,255,156,0.3)'}`, background: 'rgba(64,255,156,0.06)', color: (!newSkillTitle.trim() || !newSkillText.trim()) ? 'rgba(100,255,180,0.3)' : 'rgba(100,255,180,0.8)', cursor: (!newSkillTitle.trim() || !newSkillText.trim()) ? 'not-allowed' : 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Create & Attach
                      </button>
                    )}
                  </div>
                </div>
              </div>
              </>) : (
              /* ── Prompts Tab ── */
              <div>
                {(() => {
                  const PROMPT_SVGS = [
                    { color: '#e8c547', d: 'M4 4h16v16H4zM4 12h16M12 4v16' },
                    { color: '#47c5e8', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
                    { color: '#c547e8', d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
                    { color: '#47e88c', d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
                    { color: '#e87847', d: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
                    { color: '#4778e8', d: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
                    { color: '#e8d447', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                    { color: '#e84777', d: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122' },
                    { color: '#78e847', d: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
                  ]
                  const BUILTIN_PROMPTS = [
                    { id: 'bp-cinematic-grid', name: '2×2 Cinematic Grid', icon: 0, desc: '4-panel premium 3D animated grid', text: 'premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric morning light, little tiny dust motes, in soft sunrays soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look\n\nCreate 2x2 cinematic grid with 4 panels with 3d animated scenes in each one:\n\nPanel 1: [character action, emotions, interaction. Camera/shot type. Light, background details]\nPanel 2: [describe]\nPanel 3: [describe]\nPanel 4: [describe]\n\nEnvironment: [describe main features]\n\nStyle: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric morning light, soft depth of field, expressive animated 3D eyes, realistic textures, detailed clear emotional staging, high-quality 4K animated movie look' },
                    { id: 'bp-room-projections', name: '4 Room Projections', icon: 1, desc: 'Same room 4 camera angles in 2×2 grid', text: 'Show exact same room in four projections - 2x2 grid:\n\nPanel 1: Camera facing front. [describe wall, furniture, door, window]\nPanel 2: Camera close up facing left wall. [describe details]\nPanel 3: Top down view of the entire room. [describe layout]\nPanel 4: Camera angle from one side towards opposite wall. [describe perspective]\n\nAll panels must show SAME room, only camera angles change.\n\nStyle: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric light, expressive animated 3D eyes, realistic textures, high-quality 4K animated movie look' },
                    { id: 'bp-quality-improve', name: 'Quality Improvement', icon: 2, desc: 'Enhance quality preserving composition', text: 'Use exact @img1 but improve quality of characters and resolution. Do not change camera angle, composition, architecture or objects. Characters remain in same poses, all objects in same places. Camera same angle as @img1 only improve quality.\n\nStyle: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric morning light, soft depth of field, expressive animated 3D eyes, realistic textures, detailed clear emotional staging, high-quality 4K animated movie look' },
                  ]
                  return (<>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '1rem' }}>Prompt Blueprints</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                      {BUILTIN_PROMPTS.map((bp) => {
                        const svg = PROMPT_SVGS[bp.icon % PROMPT_SVGS.length]
                        return (
                          <button key={bp.id} type="button" onClick={() => { setNewPromptTitle(bp.name); setNewPromptText(bp.text); setEditingPromptId(bp.id) }} style={{ background: editingPromptId === bp.id ? `rgba(${parseInt(svg.color.slice(1,3),16)},${parseInt(svg.color.slice(3,5),16)},${parseInt(svg.color.slice(5,7),16)},0.08)` : 'rgba(255,255,255,0.015)', border: editingPromptId === bp.id ? `1px solid ${svg.color}66` : '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem', padding: '1.4rem 1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7rem', textAlign: 'center', transition: 'all 0.3s', overflow: 'hidden', boxShadow: editingPromptId === bp.id ? `0 0 24px ${svg.color}33` : '0 2px 12px rgba(0,0,0,0.3)' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={svg.color} strokeWidth="1.5"><path d={svg.d}/></svg>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>{bp.name}</div>
                            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>{bp.desc}</div>
                          </button>
                        )
                      })}
                      {/* Upload prompt file */}
                      <label style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.4rem 1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7rem', textAlign: 'center', transition: 'all 0.3s' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>Upload Prompt</div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>.json or .md file</div>
                        <input type="file" accept=".json,.md" style={{ display: 'none' }} onChange={(e) => {
                          const file = e.target.files?.[0]; if (!file) return
                          const reader = new FileReader()
                          reader.onload = () => {
                            try {
                              if (file.name.endsWith('.json')) {
                                const p = JSON.parse(reader.result as string)
                                setNewPromptTitle(p.name || file.name); setNewPromptText(p.text || p.fullText || p.description || '')
                              } else {
                                setNewPromptTitle(file.name.replace(/\.[^.]+$/, '')); setNewPromptText(reader.result as string)
                              }
                            } catch { setNewPromptTitle(file.name); setNewPromptText(reader.result as string || '') }
                          }
                          reader.readAsText(file)
                          e.target.value = ''
                        }} />
                      </label>
                    </div>
                    {/* Create / Edit Prompt */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
                      <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.8rem', fontWeight: 600 }}>
                        {editingPromptId ? 'Edit Prompt' : 'Create New Prompt'}
                        {editingPromptId && <button type="button" onClick={() => { setEditingPromptId(null); setNewPromptTitle(''); setNewPromptText('') }} style={{ marginLeft: '0.8rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.7rem' }}>Cancel</button>}
                      </p>
                      <input value={newPromptTitle} onChange={(e) => setNewPromptTitle(e.target.value)} placeholder="Prompt title (required)" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', color: 'white', padding: '0.6rem 1rem', fontSize: '0.85rem', marginBottom: '0.5rem', outline: 'none', fontFamily: 'inherit' }} />
                      <textarea value={newPromptText} onChange={(e) => setNewPromptText(e.target.value)} placeholder="Write your prompt template here..." style={{ width: '100%', minHeight: '120px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', color: 'white', padding: '0.8rem 1rem', fontSize: '0.82rem', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, outline: 'none' }} />
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Dictate */}
                        <button type="button" onClick={() => {
                          if (skillRecording) { skillRecognitionRef.current?.stop(); setSkillRecording(false); return }
                          const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
                          if (!SR) return
                          const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = 'en-US'
                          r.onresult = (ev: any) => { let t = ''; for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; setNewPromptText(t) }
                          r.onerror = () => setSkillRecording(false); r.onend = () => setSkillRecording(false)
                          r.start(); skillRecognitionRef.current = r; setSkillRecording(true)
                        }} style={{ padding: '0.45rem 0.8rem', borderRadius: '0.5rem', border: `1px solid ${skillRecording ? 'rgba(255,64,64,0.5)' : 'rgba(255,255,255,0.1)'}`, background: skillRecording ? 'rgba(255,64,64,0.12)' : 'rgba(255,255,255,0.03)', color: skillRecording ? '#ff6464' : 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></svg>
                          {skillRecording ? 'Stop' : 'Dictate'}
                        </button>
                        {/* AI Improve */}
                        <button type="button" disabled={aiImproving || !newPromptText.trim()} onClick={async () => {
                          if (!newPromptText.trim()) return
                          setAiImproving(true)
                          try {
                            const { sendToGemini } = await import('./gemini-agent')
                            const result = await sendToGemini(`Improve this prompt template for cinematic AI image generation. Make it more detailed, vivid and precise. Keep the structure and intent. Return ONLY the improved text:\n\n${newPromptText}`)
                            if (result.text) setNewPromptText(result.text)
                          } catch { } finally { setAiImproving(false) }
                        }} style={{ padding: '0.45rem 0.8rem', borderRadius: '0.5rem', border: '1px solid rgba(156,64,255,0.25)', background: 'rgba(156,64,255,0.06)', color: aiImproving ? 'rgba(200,160,255,0.5)' : 'rgba(200,160,255,0.75)', cursor: aiImproving ? 'wait' : 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" /></svg>
                          {aiImproving ? 'Improving...' : 'Improve with AI'}
                        </button>
                        <div style={{ flex: 1 }} />
                        {/* Use / Inject prompt */}
                        <button type="button" disabled={!newPromptText.trim()} onClick={() => {
                          onDraftChange({ ...draft, prompt: newPromptText })
                          setNewPromptTitle(''); setNewPromptText(''); setEditingPromptId(null); setShowSkillsStore(false)
                        }} style={{ padding: '0.45rem 0.8rem', borderRadius: '0.5rem', border: `1px solid ${!newPromptText.trim() ? 'rgba(64,255,156,0.15)' : 'rgba(64,255,156,0.3)'}`, background: 'rgba(64,255,156,0.06)', color: !newPromptText.trim() ? 'rgba(100,255,180,0.3)' : 'rgba(100,255,180,0.8)', cursor: !newPromptText.trim() ? 'not-allowed' : 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                          Use Prompt
                        </button>
                        {/* Save as skill file */}
                        <button type="button" disabled={!newPromptTitle.trim() || !newPromptText.trim()} onClick={async () => {
                          const slug = newPromptTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40)
                          const newPrompt = { id: `prompt-${slug || 'custom'}-${Date.now()}`, name: newPromptTitle.trim(), description: newPromptText.substring(0, 200), fullText: newPromptText, text: newPromptText, iconIdx: Math.floor(Math.random() * 9), createdAt: new Date().toISOString() }
                          await fetch('/api/skills/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPrompt) })
                          setAvailableSkills(prev => [...prev, newPrompt])
                          setNewPromptTitle(''); setNewPromptText(''); setEditingPromptId(null)
                        }} style={{ padding: '0.45rem 0.8rem', borderRadius: '0.5rem', border: `1px solid ${(!newPromptTitle.trim() || !newPromptText.trim()) ? 'rgba(64,156,255,0.15)' : 'rgba(64,156,255,0.3)'}`, background: 'rgba(64,156,255,0.06)', color: (!newPromptTitle.trim() || !newPromptText.trim()) ? 'rgba(120,180,255,0.3)' : 'rgba(120,180,255,0.8)', cursor: (!newPromptTitle.trim() || !newPromptText.trim()) ? 'not-allowed' : 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /></svg>
                          Save as Skill
                        </button>
                      </div>
                    </div>
                  </>)
                })()}
              </div>
              )}
              </div>
            </div>
          </div>
        )
      })()}
      {/* PDF BOOK VIEWER */}
      {showPdfViewer && (
        <div className="skills-store-backdrop" onClick={() => setShowPdfViewer(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(92vw, 960px)', height: 'min(88vh, 720px)', background: 'linear-gradient(145deg, rgba(20,20,30,0.96), rgba(10,10,20,0.98))', border: '1px solid rgba(212,175,55,0.12)', borderRadius: '1.5rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(212,175,55,0.06), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            {/* Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 'fit-content' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff6040" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'white', fontWeight: 700 }}>Document Viewer</h2>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem', flex: 1, overflowX: 'auto', padding: '0.2rem 0' }}>
                {pdfDocs.map(doc => (
                  <button key={doc.name} type="button" onClick={async () => {
                    setActivePdf(doc.name); setPdfCurrentPage(0); setPdfPages(['Loading...'])
                    try {
                      const pdfjsLib = await import('pdfjs-dist')
                      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
                      const encodedPath = `/assets/storyboard/docs/${encodeURIComponent(doc.name)}`
                      const loadingTask = pdfjsLib.getDocument({ url: encodedPath, isEvalSupported: false })
                      const pdf = await loadingTask.promise
                      const pages: string[] = []
                      for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i)
                        const content = await page.getTextContent()
                        pages.push(content.items.map((item: any) => item.str).join(' '))
                      }
                      setPdfPages(pages.length > 0 ? pages : ['(No text content found in this PDF)'])
                    } catch (err: any) { console.error('PDF load error:', err); setPdfPages([`Error loading PDF: ${err?.message || err}`]) }
                  }} style={{ padding: '0.3rem 0.7rem', borderRadius: '0.5rem', border: `1px solid ${activePdf === doc.name ? 'rgba(255,96,64,0.4)' : 'rgba(255,255,255,0.06)'}`, background: activePdf === doc.name ? 'rgba(255,96,64,0.08)' : 'transparent', color: activePdf === doc.name ? '#ff6040' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.72rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.2s' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    {doc.name.replace(/\.(pdf|docx|pages)$/i, '').substring(0, 20)}
                    {doc.pinned && <span onClick={(e) => { e.stopPropagation(); fetch('/api/docs/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: doc.name, pinned: false }) }).then(() => setPdfDocs(prev => prev.map(d => d.name === doc.name ? { ...d, pinned: false } : d))) }} style={{ cursor: 'pointer', opacity: 0.5, fontSize: '0.65rem' }}>📌</span>}
                  </button>
                ))}
              </div>
              <label style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: '1px solid rgba(64,255,156,0.25)', background: 'rgba(64,255,156,0.06)', color: 'rgba(100,255,180,0.8)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                Upload
                <input type="file" accept=".pdf,.docx,.pages" style={{ display: 'none' }} onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return
                  const buf = await file.arrayBuffer()
                  await fetch('/api/docs/upload', { method: 'POST', headers: { 'X-Filename': file.name }, body: buf })
                  const r = await fetch('/api/docs/list'); const d = await r.json(); setPdfDocs(d.docs || [])
                }} />
              </label>
              <button type="button" onClick={() => setShowPdfViewer(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'rgba(255,255,255,0.5)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            {/* Marker bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Marker:</span>
              {[{ c: '#ffe14d', l: 'Yellow' }, { c: '#c084fc', l: 'Purple' }, { c: '#60a5fa', l: 'Blue' }].map(mk => (
                <button key={mk.c} type="button" onClick={() => setActiveMarkerColor(mk.c)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: activeMarkerColor === mk.c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', background: mk.c + '80', cursor: 'pointer', boxShadow: activeMarkerColor === mk.c ? `0 0 12px ${mk.c}` : 'none', transition: 'all 0.2s' }} title={mk.l} />
              ))}
              {activePdf && pdfPages.length > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Page {pdfCurrentPage + 1}–{Math.min(pdfCurrentPage + 2, pdfPages.length)} of {pdfPages.length}</span>}
            </div>
            {/* Book content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
              {!activePdf || pdfPages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex' }} onDragOver={(e) => e.preventDefault()} onDrop={async (e) => {
                  e.preventDefault(); const file = e.dataTransfer.files[0]; if (!file) return
                  const buf = await file.arrayBuffer()
                  await fetch('/api/docs/upload', { method: 'POST', headers: { 'X-Filename': file.name }, body: buf })
                  const r = await fetch('/api/docs/list'); const d = await r.json(); setPdfDocs(d.docs || [])
                }}>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.008)', borderRight: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ opacity: 0.15 }}>{Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ width: '70%', maxWidth: '120px', height: '3px', background: 'white', margin: '8px auto', borderRadius: '2px' }} />)}</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.012)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.6 }}>{pdfDocs.length === 0 ? 'Drag & drop a document\nor click Upload' : 'Select a document above'}</p>
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex' }}>
                  <div style={{ flex: 1, padding: '2rem 1.8rem', overflowY: 'auto', background: 'rgba(255,255,255,0.008)', borderRight: '1px solid rgba(255,255,255,0.04)', fontSize: '0.88rem', lineHeight: 1.85, color: 'rgba(255,255,255,0.75)', fontFamily: 'Georgia, serif', whiteSpace: 'pre-wrap', cursor: 'text', userSelect: 'text' }}
                    onMouseUp={() => { const s = window.getSelection(); if (s?.toString().trim()) { const t = s.toString(), pt = pdfPages[pdfCurrentPage] || '', si = pt.indexOf(t); if (si > -1) setPdfMarkers(p => ({ ...p, [activePdf || '']: [...(p[activePdf || ''] || []), { page: pdfCurrentPage, color: activeMarkerColor, startIdx: si, endIdx: si + t.length }] })) } }}>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'sans-serif' }}>Page {pdfCurrentPage + 1}</div>
                    {(() => { const text = pdfPages[pdfCurrentPage] || '', marks = (pdfMarkers[activePdf || ''] || []).filter(m => m.page === pdfCurrentPage); if (!marks.length) return text; let parts: any[] = [], le = 0;[...marks].sort((a, b) => a.startIdx - b.startIdx).forEach(m => { if (m.startIdx > le) parts.push(<span key={`t${le}`}>{text.slice(le, m.startIdx)}</span>); parts.push(<span key={`m${m.startIdx}`} style={{ background: m.color, color: '#000', borderRadius: '3px', padding: '0 3px', fontWeight: 600 }}>{text.slice(m.startIdx, m.endIdx)}</span>); le = m.endIdx }); if (le < text.length) parts.push(<span key="e">{text.slice(le)}</span>); return parts })()}
                  </div>
                  {pdfCurrentPage + 1 < pdfPages.length && (
                    <div style={{ flex: 1, padding: '2rem 1.8rem', overflowY: 'auto', background: 'rgba(255,255,255,0.015)', fontSize: '0.88rem', lineHeight: 1.85, color: 'rgba(255,255,255,0.75)', fontFamily: 'Georgia, serif', whiteSpace: 'pre-wrap', cursor: 'text', userSelect: 'text' }}
                      onMouseUp={() => { const s = window.getSelection(); if (s?.toString().trim()) { const t = s.toString(), pt = pdfPages[pdfCurrentPage + 1] || '', si = pt.indexOf(t); if (si > -1) setPdfMarkers(p => ({ ...p, [activePdf || '']: [...(p[activePdf || ''] || []), { page: pdfCurrentPage + 1, color: activeMarkerColor, startIdx: si, endIdx: si + t.length }] })) } }}>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'sans-serif' }}>Page {pdfCurrentPage + 2}</div>
                      {(() => { const text = pdfPages[pdfCurrentPage + 1] || '', marks = (pdfMarkers[activePdf || ''] || []).filter(m => m.page === pdfCurrentPage + 1); if (!marks.length) return text; let parts: any[] = [], le = 0;[...marks].sort((a, b) => a.startIdx - b.startIdx).forEach(m => { if (m.startIdx > le) parts.push(<span key={`t${le}`}>{text.slice(le, m.startIdx)}</span>); parts.push(<span key={`m${m.startIdx}`} style={{ background: m.color, color: '#000', borderRadius: '3px', padding: '0 3px', fontWeight: 600 }}>{text.slice(m.startIdx, m.endIdx)}</span>); le = m.endIdx }); if (le < text.length) parts.push(<span key="e">{text.slice(le)}</span>); return parts })()}
                    </div>
                  )}
                </div>
              )}
            </div>
            {pdfPages.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.2rem', padding: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <button type="button" disabled={pdfCurrentPage === 0} onClick={() => setPdfCurrentPage(p => Math.max(0, p - 2))} style={{ background: 'none', border: 'none', color: pdfCurrentPage === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)', cursor: pdfCurrentPage === 0 ? 'default' : 'pointer' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="15 18 9 12 15 6" /></svg></button>
                <input type="number" min={1} max={pdfPages.length} value={pdfCurrentPage + 1} onChange={(e) => setPdfCurrentPage(Math.max(0, Math.min(pdfPages.length - 1, parseInt(e.target.value || '1') - 1)))} style={{ width: '45px', textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.82rem', padding: '0.3rem' }} />
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>/ {pdfPages.length}</span>
                <button type="button" disabled={pdfCurrentPage + 2 >= pdfPages.length} onClick={() => setPdfCurrentPage(p => Math.min(pdfPages.length - 1, p + 2))} style={{ background: 'none', border: 'none', color: pdfCurrentPage + 2 >= pdfPages.length ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)', cursor: pdfCurrentPage + 2 >= pdfPages.length ? 'default' : 'pointer' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="9 18 15 12 9 6" /></svg></button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ResourceLibrary({
  newName,
  onAdd,
  onBack,
  onCopyPath,
  onDeleteMedia,
  onLightbox,
  onNameChange,
  onResourceChange,
  onUpload,
  resources,
  type,
  onDeleteResource,
  onReorderResource,
}: {
  newName: string
  onAdd: (type: StoryboardResourceType) => void
  onBack: () => void
  onCopyPath: (media?: StoryboardMedia) => void
  onDeleteMedia: (type: StoryboardResourceType, resourceId: string, slot: StoryboardResourceSlot, mediaId: string) => void
  onLightbox: (media: StoryboardMedia, allMedia?: StoryboardMedia[], resourceContext?: { type: StoryboardResourceType; resourceId: string; slot: StoryboardResourceSlot }) => void
  onNameChange: (name: string) => void
  onResourceChange: (type: StoryboardResourceType, resourceId: string, mutate: (resource: StoryboardResource) => void) => void
  onUpload: (file: File, type: StoryboardResourceType, resourceId: string, slot: StoryboardResourceSlot) => void
  resources: StoryboardResource[]
  type: StoryboardResourceType
  onDeleteResource?: (type: StoryboardResourceType, resourceId: string) => void
  onReorderResource?: (type: StoryboardResourceType, fromId: string, toId: string) => void
}) {
  return (
    <div className={`storyboard-stage resource-library ${type}`}>
      <div className="library-command glass">
        <div>
          <p className="eyebrow">{getResourceTypeLabel(type)} bible</p>
          <h2>{getResourceTypeLabel(type)}</h2>
          <span>Build the reference library once, then attach only the needed cards to each scene.</span>
        </div>
        <div className="library-add">
          <input
            placeholder={`Name new ${type.slice(0, -1)}`}
            value={newName}
            onChange={(event) => onNameChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') onAdd(type) }}
          />
          <button aria-label={`Add ${type.slice(0, -1)}`} onClick={() => onAdd(type)} type="button">＋</button>
          <button aria-label="Back to acts and scenes" className="library-back" onClick={onBack} title="Back to acts and scenes" type="button">↩</button>
        </div>
      </div>

      <div className="resource-grid">
        {(resources || []).map((resource) => (
          <ResourceCard
            key={resource.id}
            onCopyPath={onCopyPath}
            onDeleteMedia={onDeleteMedia}
            onLightbox={onLightbox}
            onResourceChange={onResourceChange}
            onUpload={onUpload}
            resource={resource}
            type={type}
            onDeleteResource={onDeleteResource}
            onReorderResource={onReorderResource}
          />
        ))}
      </div>
    </div>
  )
}

function ResourceCard({
  compact = false,
  onCopyPath,
  onDeleteMedia,
  onLightbox,
  onResourceChange,
  onToggle,
  onUpload,
  resource,
  selected = false,
  type,
  onDeleteResource,
  onReorderResource,
}: {
  compact?: boolean
  onCopyPath?: (media?: StoryboardMedia) => void
  onDeleteMedia?: (type: StoryboardResourceType, resourceId: string, slot: StoryboardResourceSlot, mediaId: string) => void
  onLightbox?: (media: StoryboardMedia, allMedia?: StoryboardMedia[], resourceContext?: { type: StoryboardResourceType; resourceId: string; slot: StoryboardResourceSlot }) => void
  onResourceChange?: (type: StoryboardResourceType, resourceId: string, mutate: (resource: StoryboardResource) => void) => void
  onToggle?: (resourceId: string) => void
  onUpload?: (file: File, type: StoryboardResourceType, resourceId: string, slot: StoryboardResourceSlot) => void
  resource: StoryboardResource
  selected?: boolean
  type: StoryboardResourceType
  onDeleteResource?: (type: StoryboardResourceType, resourceId: string) => void
  onReorderResource?: (type: StoryboardResourceType, fromId: string, toId: string) => void
}) {
  const slot = resource.mode || 'card'
  const media = slot === 'card' ? resource.media : resource.sheetMedia
  const selectedMedia = media.find((item) => item.id === (slot === 'card' ? resource.selectedMediaId : resource.selectedSheetMediaId)) || media[0]
  const fileInputId = `${type}-${resource.id}-${slot}`
  const showAlternatives = !compact && Boolean(resource.expanded && media.length > 0)
  const mainLabel = type === 'locations' ? 'Front / Main' : 'Main'
  const sheetLabel = type === 'locations' ? 'Back / Left / Right / 4 projections' : 'Sheet'
  const activeSlotLabel = slot === 'card' ? mainLabel : sheetLabel
  const mainPreview = resource.media.find((item) => item.id === resource.selectedMediaId) || resource.media[0]
  const sheetPreview = resource.sheetMedia.find((item) => item.id === resource.selectedSheetMediaId) || resource.sheetMedia[0]

  const uploadFiles = (files: FileList | File[]) => {
    if (!onUpload) return
    Array.from(files).forEach((file) => onUpload(file, type, resource.id, slot))
  }

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) uploadFiles(event.target.files)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    if (event.dataTransfer.files?.length) uploadFiles(event.dataTransfer.files)
  }

  const handleCardDragStart = (e: React.DragEvent) => {
    if (onReorderResource) {
      e.dataTransfer.setData('text/storyboard-resource', resource.id)
    }
  }

  const handleCardDrop = (e: React.DragEvent) => {
    if (onReorderResource) {
      const fromId = e.dataTransfer.getData('text/storyboard-resource')
      if (fromId && fromId !== resource.id) {
        e.preventDefault()
        e.stopPropagation()
        onReorderResource(type, fromId, resource.id)
      }
    }
  }

  return (
    <article 
      draggable={!!onReorderResource}
      onDragStart={handleCardDragStart}
      onDrop={handleCardDrop}
      onDragOver={(e) => { if (onReorderResource) e.preventDefault() }}
      className={`resource-card glass ${type} ${compact ? 'is-compact' : ''} ${selected ? 'is-selected' : ''}`}
    >
      <div className="resource-media" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
        {!compact && <span className="resource-slot-badge">{activeSlotLabel}</span>}
	        {selectedMedia ? (
	          selectedMedia.type === 'video'
	            ? <video src={selectedMedia.url} muted playsInline />
	            : selectedMedia.type === 'audio'
	              ? <CustomAudioPlayer url={selectedMedia.url} fileName={selectedMedia.fileName} />
	              : <img src={selectedMedia.url} alt={resource.name} />
	        ) : (
	          <label htmlFor={fileInputId}>＋</label>
	        )}
	        {selectedMedia?.frameSecond !== undefined && <span className="frame-second-badge">{String(selectedMedia.frameSecond).padStart(2, '0')}s frame</span>}
        {onUpload && <input id={fileInputId} type="file" accept="image/*,video/*" multiple onChange={handleFile} />}
        <div className="shot-tools">
          {onUpload && <label htmlFor={fileInputId} title="Upload reference">＋</label>}
          {onLightbox && <button disabled={!selectedMedia} onClick={() => selectedMedia && onLightbox(selectedMedia, media, { type, resourceId: resource.id, slot })} title="Open large" type="button">⤢</button>}
          {selectedMedia && <a href={selectedMedia.url} download={selectedMedia.fileName} title="Download original">↓</a>}
          {onCopyPath && <button disabled={!selectedMedia?.localPath} onClick={() => onCopyPath(selectedMedia)} title="Reveal in Finder and copy path" type="button">⌁</button>}
          {onResourceChange && <button disabled={media.length < 1} onClick={() => onResourceChange(type, resource.id, (draft) => { draft.expanded = !draft.expanded })} title="Show options" type="button">⋯</button>}
          {onToggle && <button onClick={() => onToggle(resource.id)} title={selected ? 'Remove from scene' : 'Attach to scene'} type="button">{selected ? '✓' : '＋'}</button>}
          {onDeleteResource && <button aria-label="Delete resource card" onClick={(e) => { e.stopPropagation(); onDeleteResource(type, resource.id) }} title="Delete resource entirely" type="button" style={{ color: 'rgba(255,100,100,0.8)' }}>×</button>}
        </div>
        {selectedMedia && onDeleteMedia && (
          <button aria-label="Remove reference from board" className="media-delete" onClick={() => onDeleteMedia(type, resource.id, slot, selectedMedia.id)} title="Remove from board, keep file on disk" type="button">×</button>
        )}
      </div>
      {showAlternatives && (
        <div className="alternative-branch resource-options">
          {media.map((item, index) => (
            <button
              className={item.id === selectedMedia?.id ? 'is-active' : ''}
              key={item.id}
              onClick={() => onResourceChange?.(type, resource.id, (draft) => {
                if (slot === 'card') draft.selectedMediaId = item.id
                else draft.selectedSheetMediaId = item.id
              })}
              type="button"
            >
              <span>{index + 1}</span>
              {item.type === 'video' ? <video src={item.url} muted playsInline /> : item.type === 'audio' ? <div className="audio-alt">♪</div> : <img src={item.url} alt={item.fileName} />}
            </button>
          ))}
        </div>
      )}
      <div className="resource-card-body">
        {onResourceChange ? (
          <input value={resource.name} onChange={(event) => onResourceChange(type, resource.id, (draft) => { draft.name = event.target.value })} />
        ) : (
          <h3>{resource.name}</h3>
        )}
        {!compact && (
          <>
            <div className="resource-mode-toggle">
              <button className={slot === 'card' ? 'is-active' : ''} onClick={() => onResourceChange?.(type, resource.id, (draft) => { draft.mode = 'card' })} type="button">{mainLabel}</button>
              <button className={slot === 'sheet' ? 'is-active' : ''} onClick={() => onResourceChange?.(type, resource.id, (draft) => { draft.mode = 'sheet' })} type="button">{sheetLabel}</button>
            </div>
            <div className="resource-slot-summary">
              <button className={slot === 'card' ? 'is-active' : ''} onClick={() => onResourceChange?.(type, resource.id, (draft) => { draft.mode = 'card' })} type="button">
                {mainPreview ? (mainPreview.type === 'video' ? <video src={mainPreview.url} muted playsInline /> : <img src={mainPreview.url} alt="" />) : <span>+</span>}
                <small>{mainLabel}</small>
                <b>{resource.media.length}</b>
              </button>
              <button className={slot === 'sheet' ? 'is-active' : ''} onClick={() => onResourceChange?.(type, resource.id, (draft) => { draft.mode = 'sheet' })} type="button">
                {sheetPreview ? (sheetPreview.type === 'video' ? <video src={sheetPreview.url} muted playsInline /> : <img src={sheetPreview.url} alt="" />) : <span>+</span>}
                <small>{type === 'locations' ? 'Views' : 'Sheet'}</small>
                <b>{resource.sheetMedia.length}</b>
              </button>
            </div>
            {onResourceChange ? (
              <textarea
                placeholder={type === 'actors' ? 'Description, traits, voice, prompt lock...' : type === 'locations' ? 'Location geometry, weather, light, continuity...' : 'Prop details, scale, materials, behavior...'}
                value={resource.description}
                onChange={(event) => onResourceChange(type, resource.id, (draft) => { draft.description = event.target.value })}
              />
            ) : resource.description && <p>{resource.description}</p>}
          </>
        )}
      </div>
    </article>
  )
}

function SceneResourcePanel({
  onCopyPath,
  onLightbox,
  onToggle,
  refs,
  resources,
  type,
  onDeleteResource,
  onReorderResource,
}: {
  onCopyPath: (media?: StoryboardMedia) => void
  onLightbox: (media: StoryboardMedia, allMedia?: StoryboardMedia[], resourceContext?: { type: StoryboardResourceType; resourceId: string; slot: StoryboardResourceSlot }) => void
  onToggle: (type: StoryboardResourceType, resourceId: string) => void
  refs: string[]
  resources: StoryboardResource[]
  type: StoryboardResourceType
  onDeleteResource?: (type: StoryboardResourceType, resourceId: string) => void
  onReorderResource?: (type: StoryboardResourceType, fromId: string, toId: string) => void
}) {
  const safeResources = resources || []
  const safeRefs = refs || []
  const selected = safeResources.filter((resource) => safeRefs.includes(resource.id))
  const available = safeResources.filter((resource) => !safeRefs.includes(resource.id))

  return (
    <div className={`scene-resource-panel ${type}`}>
      <div className="scene-resource-copy">
        <p className="tip-text">✨ <strong>{getResourceTypeLabel(type)} attached to this scene</strong> define the local truth for prompting: exact characters, locations, props, and reference paths.</p>
      </div>
      {selected.length > 0 && (
        <div className="resource-grid selected-resources">
          {selected.map((resource) => <ResourceCard compact key={resource.id} onCopyPath={onCopyPath} onLightbox={onLightbox} onToggle={(id) => onToggle(type, id)} resource={resource} selected type={type} onDeleteResource={onDeleteResource} onReorderResource={onReorderResource} />)}
        </div>
      )}
      <div className="resource-grid available-resources">
        {available.map((resource) => <ResourceCard compact key={resource.id} onCopyPath={onCopyPath} onLightbox={onLightbox} onToggle={(id) => onToggle(type, id)} resource={resource} type={type} onDeleteResource={onDeleteResource} onReorderResource={onReorderResource} />)}
      </div>
    </div>
  )
}

/* ═══════ Crop Tool Component ═══════ */
function CropTool({ imageUrl, onApply, onClose }: { imageUrl: string; onApply: (croppedUrl: string) => void; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0, natW: 0, natH: 0 })
  const [crop, setCrop] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
  const [preset, setPreset] = useState<string>('Free')
  const [dragging, setDragging] = useState<{ type: 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'; startX: number; startY: number; startCrop: typeof crop } | null>(null)
  const [isCropping, setIsCropping] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const presets: { label: string; ratio: number | null }[] = [
    { label: '16:9', ratio: 16 / 9 },
    { label: '1:1', ratio: 1 },
    { label: '9:16', ratio: 9 / 16 },
    { label: '21:9', ratio: 21 / 9 },
    { label: 'Free', ratio: null },
  ]

  const applyPreset = (ratio: number | null, label: string) => {
    setPreset(label)
    if (!ratio) return
    if (imgSize.w <= 0 || imgSize.h <= 0) return  // guard division by zero
    const imgAspect = imgSize.w / imgSize.h
    let cw: number, ch: number
    if (ratio > imgAspect) {
      cw = 0.9; ch = (cw * imgSize.w) / (ratio * imgSize.h)
    } else {
      ch = 0.9; cw = (ch * imgSize.h * ratio) / imgSize.w
    }
    cw = Math.min(cw, 0.98); ch = Math.min(ch, 0.98)
    setCrop({ x: (1 - cw) / 2, y: (1 - ch) / 2, w: cw, h: ch })
  }

  const handleMouseDown = (e: React.MouseEvent, type: typeof dragging extends null ? never : NonNullable<typeof dragging>['type']) => {
    e.stopPropagation(); e.preventDefault()
    setDragging({ type, startX: e.clientX, startY: e.clientY, startCrop: { ...crop } })
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: globalThis.MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const dx = (e.clientX - dragging.startX) / rect.width
      const dy = (e.clientY - dragging.startY) / rect.height
      const sc = dragging.startCrop
      if (dragging.type === 'move') {
        setCrop({ ...sc, x: Math.max(0, Math.min(1 - sc.w, sc.x + dx)), y: Math.max(0, Math.min(1 - sc.h, sc.y + dy)) })
      } else {
        let nx = sc.x, ny = sc.y, nw = sc.w, nh = sc.h
        const t = dragging.type
        if (t.includes('n')) { ny = sc.y + dy; nh = sc.h - dy }
        if (t.includes('s')) { nh = sc.h + dy }
        if (t.includes('w')) { nx = sc.x + dx; nw = sc.w - dx }
        if (t.includes('e')) { nw = sc.w + dx }
        // Clamp
        if (nx < 0) { nw += nx; nx = 0 }
        if (ny < 0) { nh += ny; ny = 0 }
        nw = Math.max(0.03, Math.min(1 - nx, nw))
        nh = Math.max(0.03, Math.min(1 - ny, nh))
        setCrop({ x: nx, y: ny, w: nw, h: nh })
      }
    }
    const onUp = () => setDragging(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging])

  const doCrop = async () => {
    if (isCropping) return  // prevent double-click
    setIsCropping(true)
    try {
      // Fetch the image as a blob to avoid CORS canvas tainting on local URLs
      const resp = await fetch(imageUrl)
      const imgBlob = await resp.blob()
      const bmpUrl = URL.createObjectURL(imgBlob)
      const img = new Image()
      img.src = bmpUrl
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject })
      const canvas = document.createElement('canvas')
      const sx = Math.round(crop.x * img.naturalWidth), sy = Math.round(crop.y * img.naturalHeight)
      const sw = Math.round(crop.w * img.naturalWidth), sh = Math.round(crop.h * img.naturalHeight)
      if (sw <= 0 || sh <= 0) { URL.revokeObjectURL(bmpUrl); setIsCropping(false); return }
      canvas.width = sw; canvas.height = sh
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(bmpUrl); setIsCropping(false); return }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      URL.revokeObjectURL(bmpUrl)  // revoke AFTER drawImage to prevent bitmap invalidation
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) { setIsCropping(false); return }
      const formData = new FormData()
      formData.append('file', blob, `cropped-${Date.now()}.png`)
      const res = await fetch('/api/storyboard/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) onApply(data.url)
      else setIsCropping(false)
    } catch (err) {
      console.error('Crop failed:', err)
      setIsCropping(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <button type="button" onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'rgba(255,255,255,0.5)', width: '36px', height: '36px', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
      
      {/* Preset buttons on top */}
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {presets.map(p => (
          <button key={p.label} type="button" onClick={() => applyPreset(p.ratio, p.label)} style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', border: preset === p.label ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.15)', background: preset === p.label ? 'rgba(248,217,120,0.1)' : 'rgba(255,255,255,0.05)', color: preset === p.label ? 'var(--gold)' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: preset === p.label ? 700 : 400 }}>{p.label}</button>
        ))}
      </div>

      {/* Crop area */}
      <div ref={containerRef} style={{ position: 'relative', maxWidth: '80vw', maxHeight: '68vh', display: 'inline-block' }}>
        <img ref={imgRef} src={imageUrl} alt="Crop" onLoad={(e) => { const img = e.currentTarget; setImgSize({ w: img.clientWidth, h: img.clientHeight, natW: img.naturalWidth, natH: img.naturalHeight }) }} style={{ maxWidth: '80vw', maxHeight: '68vh', display: 'block', borderRadius: '0.5rem' }} />
        {/* Dark overlay outside crop */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${crop.y * 100}%`, background: 'rgba(0,0,0,0.6)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(1 - crop.y - crop.h) * 100}%`, background: 'rgba(0,0,0,0.6)' }} />
          <div style={{ position: 'absolute', top: `${crop.y * 100}%`, left: 0, width: `${crop.x * 100}%`, height: `${crop.h * 100}%`, background: 'rgba(0,0,0,0.6)' }} />
          <div style={{ position: 'absolute', top: `${crop.y * 100}%`, right: 0, width: `${(1 - crop.x - crop.w) * 100}%`, height: `${crop.h * 100}%`, background: 'rgba(0,0,0,0.6)' }} />
        </div>
        {/* Crop rectangle */}
        <div onMouseDown={(e) => handleMouseDown(e, 'move')} style={{ position: 'absolute', left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%`, border: '2px solid var(--gold)', cursor: 'move' }}>
          {/* Corner handles */}
          {(['nw', 'ne', 'sw', 'se'] as const).map(corner => (
            <div key={corner} onMouseDown={(e) => handleMouseDown(e, corner)} style={{ position: 'absolute', width: '12px', height: '12px', background: 'var(--gold)', borderRadius: '2px', cursor: `${corner}-resize`, ...(corner.includes('n') ? { top: '-6px' } : { bottom: '-6px' }), ...(corner.includes('w') ? { left: '-6px' } : { right: '-6px' }) }} />
          ))}
          {/* Edge handles for free crop — wider hit areas for reliable horizontal drag */}
          <div onMouseDown={(e) => handleMouseDown(e, 'n')} style={{ position: 'absolute', top: '-8px', left: '15%', right: '15%', height: '16px', cursor: 'n-resize', zIndex: 2 }} />
          <div onMouseDown={(e) => handleMouseDown(e, 's')} style={{ position: 'absolute', bottom: '-8px', left: '15%', right: '15%', height: '16px', cursor: 's-resize', zIndex: 2 }} />
          <div onMouseDown={(e) => handleMouseDown(e, 'w')} style={{ position: 'absolute', left: '-8px', top: '15%', bottom: '15%', width: '16px', cursor: 'w-resize', zIndex: 2 }} />
          <div onMouseDown={(e) => handleMouseDown(e, 'e')} style={{ position: 'absolute', right: '-8px', top: '15%', bottom: '15%', width: '16px', cursor: 'e-resize', zIndex: 2 }} />
          {/* Rule of thirds grid */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: '1px', background: 'rgba(248,217,120,0.3)' }} />
            <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: '1px', background: 'rgba(248,217,120,0.3)' }} />
            <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: '1px', background: 'rgba(248,217,120,0.3)' }} />
            <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: '1px', background: 'rgba(248,217,120,0.3)' }} />
          </div>
        </div>
      </div>

      {/* Dimensions + Apply */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
          {imgSize.natW > 0 ? `${Math.round(crop.w * imgSize.natW)} × ${Math.round(crop.h * imgSize.natH)} px` : ''}
        </span>
        <button className="tick-save-btn" style={{ width: '2.5rem', height: '2.5rem', opacity: isCropping ? 0.5 : 1 }} onClick={doCrop} disabled={isCropping} title="Apply crop">{isCropping ? <span style={{ fontSize: '0.6rem' }}>⏳</span> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}</button>
      </div>
    </div>
  )
}

function ShotGrid({
  actors,
  actId,
  scene,
  mode,
  onCopyPath,
  onDeleteMedia,
  onDeleteShot,
  onDuplicateShot,
  onLightbox,
  onEmptyLightbox,
  onReorder,
  onShotChange,
  onUpload,
  selectedShotId,
  onSelectShot,
  masterAspect,
  setMasterAspect,
  onRowToggle,
  onMoveMedia,
}: {
  actors: string[]
  actId: string
  scene: StoryboardScene
  mode: StoryboardSequenceMode
  onCopyPath: (media?: StoryboardMedia) => void
  onDeleteMedia: (actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string, mediaId: string) => void
  onDeleteShot: (actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string) => void
  onDuplicateShot: (actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string) => void
  onLightbox: (media: StoryboardMedia, allMedia: StoryboardMedia[], shotId: string) => void
  onEmptyLightbox: (shotId: string) => void
  onReorder: (actId: string, sceneId: string, mode: StoryboardSequenceMode, fromId: string, toId: string) => void
  onShotChange: (actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string, mutate: (shot: StoryboardShot) => void) => void
  onUpload: (file: File, actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string) => void
  selectedShotId: string | null
  onSelectShot: (id: string | null) => void
  masterAspect?: number
  setMasterAspect?: (aspect: number) => void
  onRowToggle: (rowIndex: number, expanded: boolean) => void
  onMoveMedia?: (actId: string, sceneId: string, mode: StoryboardSequenceMode, fromShotId: string, toShotId: string, mediaId: string) => void
}) {
  const shots = getSceneShots(scene, mode)
  const [altPage, setAltPage] = useState<Record<string, number>>({})

  const handleFile = (event: ChangeEvent<HTMLInputElement>, shotId: string) => {
    const file = event.target.files?.[0]
    if (file) onUpload(file, actId, scene.id, mode, shotId)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLElement>, shotId: string) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      onUpload(file, actId, scene.id, mode, shotId)
      return
    }
    
    const mediaData = event.dataTransfer.getData('text/storyboard-media')
    if (mediaData) {
      try {
        const { shotId: fromShotId, mediaId } = JSON.parse(mediaData)
        if (fromShotId && mediaId && fromShotId !== shotId) {
          onMoveMedia?.(actId, scene.id, mode, fromShotId, shotId, mediaId)
        }
      } catch (e) {
        // ignore JSON parse error
      }
      return
    }

    const fromId = event.dataTransfer.getData('text/storyboard-shot')
    if (fromId) onReorder(actId, scene.id, mode, fromId, shotId)
  }

  return (
    <div className="shot-grid">
      {shots.map((shot, index) => {
        const selected = shot.media.find((media) => media.id === shot.selectedMediaId) || shot.media[0]
        const dialoguePreview = shot.actor && shot.dialogue ? `${shot.actor.toUpperCase()}: ${shot.dialogue}` : shot.dialogue
        const fileInputId = `${scene.id}-${mode}-${shot.id}`
        const isSelected = selectedShotId === shot.id
        const page = altPage[shot.id] || 0
        const altPerPage = 4
        const totalAlts = shot.media.length
        const totalPages = Math.ceil(totalAlts / altPerPage)
        const visibleAlts = shot.media.slice(page * altPerPage, (page + 1) * altPerPage)

        return (
          <article
            className={`shot-card glass ${isSelected ? 'is-selected' : ''}`}
            draggable
            key={shot.id}
            onClick={() => onSelectShot(isSelected ? null : shot.id)}
            onDragStart={(event) => event.dataTransfer.setData('text/storyboard-shot', shot.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, shot.id)}
            style={isSelected ? { outline: '1px solid rgba(248,217,120,0.4)', outlineOffset: '2px', transform: 'translateY(-4px) scale(1.02)', boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(248,217,120,0.08)', zIndex: 5 } : undefined}
          >
            {/* Shot number — hover shows + to duplicate */}
            <div className="shot-number" onClick={(e) => { e.stopPropagation(); onDuplicateShot(actId, scene.id, mode, shot.id) }} title="Duplicate shot" style={{ cursor: 'pointer' }}>
              <span className="shot-number-text">{String(index + 1).padStart(2, '0')}</span>
              <span className="shot-number-plus">+</span>
            </div>
            <div className="shot-media" style={{ position: 'relative', ...(masterAspect ? { aspectRatio: String(masterAspect) } : {}) }}>
	              {selected ? (
	                selected.type === 'video'
	                  ? <video src={selected.url} muted playsInline onDoubleClick={(e) => { e.stopPropagation(); onLightbox(selected, shot.media, shot.id) }} style={{ cursor: 'pointer' }} />
                  : selected.type === 'audio'
                    ? <CustomAudioPlayer url={selected.url} fileName={selected.fileName} />
                    : <img src={selected.url} alt={shot.title} onDoubleClick={(e) => {
                        e.stopPropagation()
                        const img = e.currentTarget
                        if (img.naturalWidth && img.naturalHeight && setMasterAspect) {
                          setMasterAspect(img.naturalWidth / img.naturalHeight)
                        }
                        onLightbox(selected, shot.media, shot.id)
                      }} style={{ cursor: 'pointer' }} />
              ) : (
                <div className={`empty-shot-canvas ${mode === 'videos' ? 'is-video-slot' : mode === 'audio' ? 'is-audio-slot' : ''}`} onDoubleClick={(e) => { e.stopPropagation(); onEmptyLightbox(shot.id) }} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(248,217,120,0.02), rgba(255,255,255,0.01))', borderRadius: '0.5rem', gap: '0.5rem', minHeight: '140px', border: '1px dashed rgba(248,217,120,0.1)' }}>
                  {mode === 'videos' ? (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(248,217,120,0.3)" strokeWidth="1.5"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 9l4-2v10l-4-2z"/></svg>
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(248,217,120,0.3)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  )}
	                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>Double-click to create {mode === 'videos' ? 'video' : mode === 'audio' ? 'audio' : ''}</span>
	                </div>
	              )}
	              {selected?.frameSecond !== undefined && <span className="frame-second-badge">{String(selected.frameSecond).padStart(2, '0')}s frame</span>}
              <input id={fileInputId} type="file" accept={mode === 'images' ? 'image/*' : mode === 'videos' ? 'video/*' : 'audio/*'} onChange={(event) => handleFile(event, shot.id)} />
              <div className="shot-tools">
                <label htmlFor={fileInputId} title="Upload alternative">+</label>
                <button disabled={!selected} onClick={(e) => { e.stopPropagation(); selected && onLightbox(selected, shot.media, shot.id) }} title="Open large" type="button">⤢</button>
                <a className={!selected ? 'is-disabled' : ''} href={selected?.url || '#'} download={selected?.fileName} title="Download original">↓</a>
                <button disabled={!selected?.localPath} onClick={(e) => { e.stopPropagation(); onCopyPath(selected) }} title="Reveal in Finder and copy path" type="button">⌁</button>
                <button onClick={(e) => { e.stopPropagation(); onRowToggle(Math.floor(index / 4), !shot.expanded) }} title="Toggle Row Collapse" type="button"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
              </div>
              {selected ? (
                <button aria-label="Remove media from board" className="media-delete" onClick={(e) => { e.stopPropagation(); onDeleteMedia(actId, scene.id, mode, shot.id, selected.id) }} title="Remove from board, keep file on disk" type="button">×</button>
              ) : (
                <button aria-label="Delete empty shot" className="media-delete" onClick={(e) => { e.stopPropagation(); onDeleteShot(actId, scene.id, mode, shot.id) }} title="Delete empty shot" type="button">×</button>
              )}
              {/* Pagination arrows as overlays on the image */}
              {shot.expanded && totalPages > 1 && page > 0 && (
                <button type="button" className="shot-alt-arrow left" onClick={(e) => { e.stopPropagation(); setAltPage(prev => ({ ...prev, [shot.id]: page - 1 })) }}>‹</button>
              )}
              {shot.expanded && totalPages > 1 && page < totalPages - 1 && (
                <button type="button" className="shot-alt-arrow right" onClick={(e) => { e.stopPropagation(); setAltPage(prev => ({ ...prev, [shot.id]: page + 1 })) }}>›</button>
              )}
            </div>

            {shot.expanded && (
              <div className="alternative-branch">
                {Array.from({ length: Math.max(4, visibleAlts.length) }).map((_, slotIdx) => {
                  const media = visibleAlts[slotIdx]
                  if (media) {
                    return (
                      <button 
                        className={media.id === selected?.id ? 'is-active' : ''} 
                        key={media.id} 
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/storyboard-media', JSON.stringify({ shotId: shot.id, mediaId: media.id }))
                        }}
                        onClick={(e) => { e.stopPropagation(); onShotChange(actId, scene.id, mode, shot.id, (draft) => { draft.selectedMediaId = media.id }) }} 
                        type="button"
                      >
                        <span>{page * altPerPage + slotIdx + 1}</span>
                        {media.type === 'video' ? <video src={media.url} muted playsInline /> : media.type === 'audio' ? <div className="audio-alt">♪</div> : <img src={media.url} alt={media.fileName} />}
                      </button>
                    )
                  }
                  return (
                    <label key={`empty-${slotIdx}`} htmlFor={fileInputId} style={{ aspectRatio: '1', display: 'grid', placeItems: 'center', border: '1px dashed rgba(248,217,120,0.2)', borderRadius: '0.7rem', background: 'rgba(248,217,120,0.02)', cursor: 'pointer', color: 'rgba(248,217,120,0.3)', fontSize: '1.2rem', fontWeight: 300, transition: 'border-color 0.2s, background 0.2s' }} onClick={(e) => e.stopPropagation()}>+</label>
                  )
                })}
              </div>
            )}

            {shot.expanded && (
              <>
                <input
                  className="shot-title-input"
                  value={shot.title}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(event) => onShotChange(actId, scene.id, mode, shot.id, (draft) => { draft.title = event.target.value })}
                />
                <textarea
                  placeholder={mode === 'images' ? 'Image prompt / shot notes' : mode === 'videos' ? 'Video prompt / animation notes' : 'Music cue / SFX notes'}
                  value={shot.prompt}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(event) => onShotChange(actId, scene.id, mode, shot.id, (draft) => { draft.prompt = event.target.value })}
                />
                <div className="dialogue-row">
                  <select value={shot.actor} onClick={(e) => e.stopPropagation()} onChange={(event) => onShotChange(actId, scene.id, mode, shot.id, (draft) => { draft.actor = event.target.value })}>
                    <option value="">Narration / action</option>
                    {actors.map((actor) => <option key={actor} value={actor}>{actor}</option>)}
                  </select>
                  <textarea
                    placeholder="Dialogue or action text"
                    value={shot.dialogue}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(event) => onShotChange(actId, scene.id, mode, shot.id, (draft) => { draft.dialogue = event.target.value })}
                  />
                </div>
                {dialoguePreview && <p className="dialogue-preview">{dialoguePreview}</p>}
              </>
            )}
          </article>
        )
      })}
    </div>
  )
}

function BookPageText({ text }: { text: string }) {
  return (
    <div className="book-text">
      {text.split('\n').map((rawLine, index) => {
        const line = rawLine.trim()
        if (!line) return <br key={`br-${index}`} />

        const isAct = /^ACT\s+\d+/i.test(line)
        const isScene = /^(INT\.|EXT\.|SONG SEQUENCE|VERSE|CHORUS|PRE-CHORUS|FINAL CHORUS|FADE OUT|END OF ACT)/i.test(line)
        const isDialogueName = /^[A-Z][A-Z\s#.'-]{2,}:?$/.test(line) && line.length < 42

        if (isAct) return <h4 className="book-act-title" key={index}>{line}</h4>
        if (isScene) return <h5 className="book-scene-heading" key={index}>{line}</h5>
        if (isDialogueName) return <strong className="book-dialogue-name" key={index}>{line}</strong>
        return <p key={index}>{line}</p>
      })}
    </div>
  )
}

function CharacterSection({
  activeId,
  activeTab,
  category,
  categoryTitle,
  onCapture,
  onAdd,
  onDeleteImage,
  onPick,
  onReorder,
  onTab,
  onUpdateCategoryTitle,
  onUpdateProfile,
  onUploadImage,
  onUploadPresentationVideo,
  profiles,
}: {
  activeId: string
  activeTab: 'description' | 'traits' | 'video'
  category: CharacterCategory
  categoryTitle: string
  onCapture: (elementId: string, fileName: string) => void
  onAdd: () => void
  onDeleteImage: (id: string) => void
  onPick: (id: string) => void
  onReorder: (dragId: string, targetId: string) => void
  onTab: (tab: 'description' | 'traits' | 'video') => void
  onUpdateCategoryTitle: (value: string) => void
  onUpdateProfile: (id: string, patch: Partial<CharacterProfile>) => void
  onUploadImage: (id: string, file: File) => void
  onUploadPresentationVideo: (id: string, file: File) => void
  profiles: CharacterProfile[]
}) {
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const active = profiles.find((profile) => profile.id === activeId) || profiles[0]
  if (!active) return null
  const placement = active.imagePlacement || { x: 0, y: 0, scale: 1 }
  const videoPlacement = active.videoPlacement || { x: 0, y: 0, scale: 1 }
  const activeIsVideo = isVideoAsset(active.image)
  const clampPlacement = (next: CharacterPlacement): CharacterPlacement => ({
    x: Math.max(-360, Math.min(360, next.x)),
    y: Math.max(-360, Math.min(360, next.y)),
    scale: Math.max(0.45, Math.min(3.8, next.scale)),
  })
  const startPlacementDrag = (event: ReactPointerEvent<HTMLDivElement>, mode: 'move' | 'scale') => {
    if (!active.image) return
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const initial = placement
    event.currentTarget.setPointerCapture(event.pointerId)
    const handleMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      const next = mode === 'move'
        ? { ...initial, x: initial.x + dx, y: initial.y + dy }
        : { ...initial, scale: initial.scale + Math.max(dx, -dy) / 180 }
      onUpdateProfile(active.id, { imagePlacement: clampPlacement(next) })
    }
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp, { once: true })
  }
  const startVideoPlacementDrag = (event: ReactPointerEvent<HTMLDivElement>, mode: 'move' | 'scale') => {
    if (!active.videoPresentation) return
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const initial = videoPlacement
    event.currentTarget.setPointerCapture(event.pointerId)
    const handleMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      const next = mode === 'move'
        ? { ...initial, x: initial.x + dx, y: initial.y + dy }
        : { ...initial, scale: initial.scale + Math.max(dx, -dy) / 180 }
      onUpdateProfile(active.id, { videoPlacement: clampPlacement(next) })
    }
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp, { once: true })
  }

  return (
    <div className={`character-block ${category}`}>
      <div className="character-block-heading">
        <span className="editable-copy" contentEditable suppressContentEditableWarning onBlur={(event) => onUpdateCategoryTitle(event.currentTarget.textContent || categoryTitle)}>{categoryTitle}</span>
        <strong>{profiles.length} playable dossiers</strong>
      </div>
      <div
        className="character-stage glass"
        id={`character-panel-${category}`}
        onDragOver={(event) => {
          if (activeTab === 'video') event.preventDefault()
        }}
        onDrop={(event) => {
          if (activeTab !== 'video') return
          event.preventDefault()
          const file = Array.from(event.dataTransfer.files || []).find((item) => item.type.startsWith('video'))
          if (file) onUploadPresentationVideo(active.id, file)
        }}
      >
        <div className="character-capture-tools">
          <button
            aria-label="Capture full character panel"
            onClick={() => onCapture(`character-panel-${category}`, `${active.name}-full-character-panel`)}
            title="Capture full character panel"
            type="button"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 4l1.7 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.8l1.7-2z"/><circle cx="12" cy="13" r="3.5"/></svg>
          </button>
        </div>
        <div
          className="character-portrait editable-media-card"
          id={`character-portrait-${category}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const file = Array.from(event.dataTransfer.files || []).find((item) => item.type.startsWith('image') || item.type.startsWith('video'))
            if (file) onUploadImage(active.id, file)
          }}
        >
          {active.image ? (
            <div
              className="character-image-layer"
              onPointerDown={(event) => startPlacementDrag(event, 'move')}
              style={{
                '--char-x': `${placement.x}px`,
                '--char-y': `${placement.y}px`,
                '--char-scale': placement.scale,
              } as CSSProperties}
              title="Drag to reposition"
            >
              {activeIsVideo ? (
                <video src={active.image} aria-label={active.name} autoPlay loop muted playsInline preload="auto" draggable={false} />
              ) : (
                <img src={active.image} alt={active.name} draggable={false} />
              )}
            </div>
          ) : <div className="empty-character-media">Drop character art</div>}
          <button
            aria-label="Capture character portrait"
            className="character-portrait-capture"
            onClick={() => onCapture(`character-portrait-${category}`, `${active.name}-portrait-panel`)}
            title="Capture portrait panel"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 4l1.7 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.8l1.7-2z"/><circle cx="12" cy="13" r="3.5"/></svg>
          </button>
          <div className="showcase-edit-tools character-edit-tools">
            <label title="Replace character art">
              +
              <input type="file" accept="image/*,video/*" onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onUploadImage(active.id, file)
                event.target.value = ''
              }} />
            </label>
            <button title="Remove character art" type="button" onClick={() => onDeleteImage(active.id)}>×</button>
          </div>
          {active.image && (
            <div className="character-placement-tools">
              <button
                title="Reset image placement"
                type="button"
                onClick={() => onUpdateProfile(active.id, { imagePlacement: { x: 0, y: 0, scale: 1 } })}
              >
                Fit
              </button>
              <span>Drag image · pull corner</span>
            </div>
          )}
          {active.image && (
            <div
              aria-label="Resize character art"
              className="character-resize-handle"
              onPointerDown={(event) => startPlacementDrag(event, 'scale')}
              title="Drag to resize"
            />
          )}
        </div>
        <div className={`character-info ${activeTab === 'video' ? 'is-video-tab' : ''} ${activeTab === 'video' && active.videoPresentation ? 'has-presentation-video' : ''}`}>
          <p className="eyebrow editable-copy" contentEditable suppressContentEditableWarning onBlur={(event) => onUpdateCategoryTitle(event.currentTarget.textContent || categoryTitle)}>{categoryTitle}</p>
          <h3 className="editable-copy character-name-clamp" contentEditable suppressContentEditableWarning onBlur={(event) => onUpdateProfile(active.id, { name: event.currentTarget.textContent || active.name })}>{active.name}</h3>
          <span className="editable-copy character-role-clamp" contentEditable suppressContentEditableWarning onBlur={(event) => onUpdateProfile(active.id, { role: event.currentTarget.textContent || active.role })}>{active.role}</span>
          <div className="profile-tabs">
            <button className={activeTab === 'description' ? 'is-active' : ''} onClick={() => onTab('description')} type="button">Description</button>
            <button className={activeTab === 'traits' ? 'is-active' : ''} onClick={() => onTab('traits')} type="button">Traits</button>
            <button className={activeTab === 'video' ? 'is-active' : ''} onClick={() => onTab('video')} type="button">Video presentation</button>
          </div>
          <div className="profile-content">
            {activeTab === 'description' && (
              <>
                <p className="editable-copy profile-text-clamp" contentEditable suppressContentEditableWarning onBlur={(event) => onUpdateProfile(active.id, { description: event.currentTarget.textContent || active.description })}>{active.description}</p>
                <p className="editable-copy profile-text-clamp" contentEditable suppressContentEditableWarning onBlur={(event) => onUpdateProfile(active.id, { backstory: event.currentTarget.textContent || active.backstory })}>{active.backstory}</p>
              </>
            )}
            {activeTab === 'traits' && (
              <div className="trait-grid">
                {active.traits.map((trait, index) => <span className="editable-copy" contentEditable suppressContentEditableWarning key={`${trait}-${index}`} onBlur={(event) => {
                  const traits = [...active.traits]
                  traits[index] = event.currentTarget.textContent || trait
                  onUpdateProfile(active.id, { traits })
                }}>{trait}</span>)}
              </div>
            )}
          </div>
        </div>
        {activeTab === 'video' && active.videoPresentation && (
          <div className="character-presentation-overlay">
            <div
              className="character-presentation-layer"
              onPointerDown={(event) => startVideoPlacementDrag(event, 'move')}
              style={{
                '--video-x': `${videoPlacement.x}px`,
                '--video-y': `${videoPlacement.y}px`,
                '--video-scale': videoPlacement.scale,
              } as CSSProperties}
              title="Drag to reposition video"
            >
              <video src={active.videoPresentation} autoPlay loop muted={active.videoMuted ?? false} playsInline preload="auto" />
            </div>
            <div className="character-presentation-tools">
              <button type="button" onClick={() => onUpdateProfile(active.id, { videoMuted: !(active.videoMuted ?? false) })}>{active.videoMuted ? 'Sound' : 'Mute'}</button>
              <button type="button" onClick={() => onUpdateProfile(active.id, { videoPlacement: { x: 0, y: 0, scale: 1 } })}>Fit</button>
              <button type="button" onClick={() => onUpdateProfile(active.id, { videoPresentation: '', videoPlacement: { x: 0, y: 0, scale: 1 } })}>×</button>
            </div>
            <div
              aria-label="Resize presentation video"
              className="character-presentation-resize"
              onPointerDown={(event) => startVideoPlacementDrag(event, 'scale')}
              title="Drag to resize video"
            />
          </div>
        )}
      </div>
      <div className="portrait-picker-wrap">
        {profiles.length > 6 && (
          <button className="portrait-picker-arrow is-left" onClick={() => pickerRef.current?.scrollBy({ left: -520, behavior: 'smooth' })} type="button" aria-label="Scroll characters left">‹</button>
        )}
      <div className="portrait-picker" ref={pickerRef}>
        {profiles.map((profile) => (
          <button
            className={active.id === profile.id ? 'is-active' : ''}
            draggable
            key={profile.id}
            onClick={() => onPick(profile.id)}
            onDragStart={(event) => event.dataTransfer.setData('text/character-id', profile.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const dragId = event.dataTransfer.getData('text/character-id')
              if (dragId) onReorder(dragId, profile.id)
            }}
            type="button"
          >
            {profile.image ? (
              <span className="portrait-picker-image">
                <span
                  className="portrait-picker-image-layer"
                  style={{
                    '--thumb-x': `${(profile.imagePlacement?.x || 0) * 0.46}px`,
                    '--thumb-y': `${(profile.imagePlacement?.y || 0) * 0.46}px`,
                    '--thumb-scale': profile.imagePlacement?.scale || 1,
                  } as CSSProperties}
                >
                  {isVideoAsset(profile.image) ? (
                    <video src={profile.image} aria-label={profile.name} autoPlay loop muted playsInline preload="auto" draggable={false} />
                  ) : (
                    <img src={profile.image} alt={profile.name} draggable={false} />
                  )}
                </span>
              </span>
            ) : <span className="portrait-empty">+</span>}
            <span>{profile.name}</span>
          </button>
        ))}
        <button className="portrait-picker-add" onClick={onAdd} type="button">
          <span className="portrait-empty">+</span>
          <span>Add</span>
        </button>
      </div>
        {profiles.length > 6 && (
          <button className="portrait-picker-arrow is-right" onClick={() => pickerRef.current?.scrollBy({ left: 520, behavior: 'smooth' })} type="button" aria-label="Scroll characters right">›</button>
        )}
      </div>
    </div>
  )
}

function ScoreConsole({ activeTrack, onSelect, tracks }: { activeTrack: number; onSelect: (index: number) => void; tracks: Track[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [editableTracks, setEditableTracks] = useState<Track[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('aisha-showcase-score-tracks') || '[]') as Track[]
      if (!Array.isArray(saved) || !saved.length) return tracks
      return tracks.map((base) => ({ ...base, ...(saved.find((item) => item.src === base.src || item.title === base.title) || {}) }))
    } catch {
      return tracks
    }
  })
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [albumPage, setAlbumPage] = useState(0)
  const track = editableTracks[activeTrack] || editableTracks[0]
  const progress = duration ? current / duration : 0
  const albumPages = Math.max(1, Math.ceil(editableTracks.length / 6))
  const visibleTracks = editableTracks.slice(albumPage * 6, albumPage * 6 + 6)

  const updateTrack = (index: number, patch: Partial<Track>) => {
    setEditableTracks((current) => {
      const next = current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
      localStorage.setItem('aisha-showcase-score-tracks', JSON.stringify(next))
      return next
    })
  }

  const uploadTrackCover = async (index: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/storyboard/upload', { method: 'POST', body: formData })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Upload failed')
    if (payload.url) updateTrack(index, { cover: payload.url })
  }

  useEffect(() => {
    setCurrent(0)
    setPlaying(false)
    audioRef.current?.load()
  }, [activeTrack])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAlbumPage((page) => (page + 1) % albumPages)
    }, 15000)
    return () => window.clearInterval(timer)
  }, [albumPages])

  useEffect(() => {
    setAlbumPage(Math.floor(activeTrack / 6))
  }, [activeTrack])

  const toggle = () => {
    if (!audioRef.current || !track.src) return
    if (audioRef.current.paused) {
      audioRef.current.play()
      setPlaying(true)
    } else {
      audioRef.current.pause()
      setPlaying(false)
    }
  }

  const seek = (event: MouseEvent<HTMLButtonElement>) => {
    if (!audioRef.current || !duration) return
    const rect = event.currentTarget.getBoundingClientRect()
    const next = ((event.clientX - rect.left) / rect.width) * duration
    audioRef.current.currentTime = next
    setCurrent(next)
  }

  return (
    <div className="score-console glass" style={{ '--track-color': track.color } as CSSProperties}>
      <audio
        ref={audioRef}
        src={track.src}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
      />
      <div className="now-playing">
        <div className="score-visual">
          <img src={track.cover} alt={track.title} />
          <label className="score-cover-upload" title="Replace cover">
            +
            <input type="file" accept="image/*" onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) uploadTrackCover(activeTrack, file).catch(() => {})
              event.target.value = ''
            }} />
          </label>
        </div>
        <div className="score-player">
          <p className="eyebrow">Now playing</p>
          <h3 className="editable-copy" contentEditable suppressContentEditableWarning onBlur={(event) => updateTrack(activeTrack, { title: event.currentTarget.textContent || track.title })}>{track.title}</h3>
          <p className="editable-copy" contentEditable suppressContentEditableWarning onBlur={(event) => updateTrack(activeTrack, { mood: event.currentTarget.textContent || track.mood })}>{track.mood}</p>
          <div className={`score-wave ${playing ? 'is-playing' : ''}`}>
            {Array.from({ length: 48 }).map((_, bar) => (
              <i key={bar} style={{ height: `${18 + ((bar * 17) % 68)}%`, '--bar': bar } as CSSProperties} />
            ))}
          </div>
          <button className="score-progress" disabled={!track.src} onClick={seek} type="button">
            <span style={{ transform: `scaleX(${progress})` }} />
          </button>
          <button className="play-control" disabled={!track.src} onClick={toggle} type="button">
            {track.src ? (playing ? 'Pause' : 'Play') : 'Coming soon'}
          </button>
        </div>
      </div>
      <div className="album-panel">
        <div className="album-grid">
          {visibleTracks.map((item, index) => {
            const trackIndex = albumPage * 6 + index

            return (
              <button className={activeTrack === trackIndex ? 'is-active' : ''} key={item.title} onClick={() => onSelect(trackIndex)} type="button">
                <img src={item.cover} alt={item.title} />
                <span>{item.title}</span>
              </button>
            )
          })}
        </div>
        <div className="album-dots">
          {Array.from({ length: albumPages }).map((_, index) => (
            <button aria-label={`Show album page ${index + 1}`} className={albumPage === index ? 'is-active' : ''} key={index} onClick={() => setAlbumPage(index)} type="button">
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function WorldMap({ focus, onFocus }: { focus: 'spain' | 'la'; onFocus: (focus: 'spain' | 'la') => void }) {
  return (
    <div className={`world-map ${focus}`}>
      <img src="/assets/generated/world-map-contour.svg" alt="Golden world map route between Los Angeles and Spain" />
      <button className={`map-pin map-pin-la ${focus === 'la' ? 'is-active' : ''}`} onClick={() => onFocus('la')} type="button">
        <strong>Los Angeles</strong>
        <span>Festival and studio conversations</span>
      </button>
      <button className={`map-pin map-pin-spain ${focus === 'spain' ? 'is-active' : ''}`} onClick={() => onFocus('spain')} type="button">
        <strong>Spain</strong>
        <span>BrightBox creative base</span>
      </button>
    </div>
  )
}

export default App
