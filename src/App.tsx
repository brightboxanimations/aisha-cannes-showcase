import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent, DragEvent, MouseEvent } from 'react'
import { chatWithAgent, generatePrompt, refinePrompt, type AgentMessage } from './gemini-agent'
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

type CharacterCategory = 'protagonists' | 'antagonists' | 'sidekicks'

type CharacterProfile = {
  id: string
  category: CharacterCategory
  name: string
  role: string
  image: string
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

type MerchProduct = {
  title: string
  subtitle: string
  images: string[]
  copy: string
  features: string[]
}

type StoryboardMedia = {
  id: string
  type: 'image' | 'video' | 'audio'
  url: string
  fileName: string
  localPath?: string
  createdAt: string
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
    actors: payload.resources?.actors?.length ? payload.resources.actors : actorNames.map((actor) => createResource('actors', actor)),
    locations: payload.resources?.locations?.length ? payload.resources.locations : locationNames.map((location) => createResource('locations', location)),
    props: payload.resources?.props || [],
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
    image: '/assets/pdf-characters/antagonists/antagonists-p04-01.png',
    description: 'A watchful keeper of forbidden knowledge, elegant and severe, with memory hidden behind every jewel.',
    traits: ['Ancient', 'Watchful', 'Ceremonial', 'Unsettling'],
    backstory: 'The Oracle guards old consequences. She stands where prophecy stops being decorative and becomes dangerous.',
  },
  {
    id: 'mir-kaan',
    category: 'antagonists',
    name: 'Prince Mir-Kaan',
    role: 'Ruler of Mirage City',
    image: '/assets/pdf-characters/antagonists/antagonists-p06-02.png',
    description: 'Polished, charming, and manipulative, Mir-Kaan smiles like a door closing.',
    traits: ['Manipulative', 'Power hungry', 'Deceptive', 'Elegant'],
    backstory: 'Mir-Kaan belongs to the beautiful surface of the trap: everything glitters, every courtesy has teeth.',
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
    image: '/assets/pdf-characters/antagonists/antagonists-p14-01.png',
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
  { title: 'One Wish', mood: 'Aisha’s intimate magical awakening.', src: '/assets/music/one-wish.mp3', cover: '/assets/locations/magic-night-bedroom-balcony.png', color: '#f7d978' },
  { title: 'Wake Again, Mayala City', mood: 'Ancient city memory returning to light.', src: '/assets/music/wake-again-mayala-city.mp3', cover: '/assets/locations/front-balcony-night.png', color: '#7edbff' },
  { title: 'Sharak Song', mood: 'Villain triumph, charm, and obsession.', src: '/assets/music/sharak-song.mp3', cover: '/assets/pdf-characters/antagonists/antagonists-p08-02.png', color: '#f06f8f' },
  { title: 'Thousand Wonders', mood: 'Market discovery, motion, and delight.', src: '/assets/music/thousand-wonders.wav', cover: '/assets/locations/niura-rescue-grid.jpg', color: '#a6f0b0' },
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
  const [route, setRoute] = useState(() => window.location.hash || '#hero')
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
  const [activeTrack, setActiveTrack] = useState(0)
  const [activeMerchVariants, setActiveMerchVariants] = useState<Record<string, number>>({})
  const [mapFocus, setMapFocus] = useState<'spain' | 'la'>('spain')
  const heroVideoRef = useRef<HTMLVideoElement | null>(null)

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
      setActiveHero((slide) => (slide + 1) % heroSlides.length)
    }, 6200)
    return () => window.clearInterval(timer)
  }, [heroPlaying])

  const pages = bookMode === 'script' ? scriptPages : songPages
  const openPages = [pages[bookPage], pages[bookPage + 1]].filter(Boolean)
  const currentHero = heroSlides[activeHero]

  const playPrimaryTrailer = () => {
    setActiveHero(0)
    window.setTimeout(() => heroVideoRef.current?.play(), 80)
  }

  const switchHero = (index: number) => {
    setHeroPlaying(false)
    setActiveHero(index)
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
          <div className="hero-media">
            {currentHero.kind === 'video' ? (
              <video
                ref={currentHero.id === 'main-trailer' ? heroVideoRef : undefined}
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
            <span>{String(activeHero + 1).padStart(2, '0')} / {String(heroSlides.length).padStart(2, '0')}</span>
            <div className="hero-dots">
              {heroSlides.map((slide, index) => (
                <button aria-label={`Show ${slide.kicker}`} className={activeHero === index ? 'is-active' : ''} key={slide.id} onClick={() => switchHero(index)} type="button" />
              ))}
            </div>
          </div>
          <div className="hero-copy">
            <p className="eyebrow">{currentHero.kicker}</p>
            <h1>{currentHero.title}</h1>
            <p>{currentHero.caption}</p>
            <div className="hero-actions">
              <button className="gold-button" onClick={playPrimaryTrailer} type="button">Press play</button>
              <a className="ghost-button" href="#book">Open story bible</a>
            </div>
          </div>
        </div>

        <div className="hero-strip" aria-label="Hero carousel">
          {heroSlides.map((slide, index) => (
            <button className={`hero-thumb ${activeHero === index ? 'is-active' : ''}`} key={slide.id} onClick={() => switchHero(index)} type="button">
              <span>{slide.kicker}</span>
              <strong>{slide.title}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="section" id="gallery">
        <SectionTitle eyebrow="Art bible" title="Act Gallery" copy="Choose an act, then browse twelve cinematic art slots for that chapter. As we add more final art, each act can receive its own dedicated set." />
        <div className="act-menu" aria-label="Choose act gallery">
          {actNames.map((act, index) => (
            <button className={activeAct === index ? 'is-active' : ''} key={act} onClick={() => setActiveAct(index)} type="button">
              {act}
            </button>
          ))}
        </div>
        <div className="act-grid">
          {galleryPool.map(([title, src], index) => (
            <article className="act-card glass" key={`${actNames[activeAct]}-${title}-${index}`}>
              <img src={src} alt={title} />
              <div>
                <span>{actNames[activeAct]} / Frame {String(index + 1).padStart(2, '0')}</span>
                <h3>{activeAct === 0 ? title : `${actNames[activeAct]}: ${title}`}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section cast-section" id="characters">
        <SectionTitle eyebrow="Character bible" title="Character Panels" copy="One active profile per section, with portrait selectors underneath. Text now lives in the same cinematic panel as the character." />
        {(['protagonists', 'antagonists', 'sidekicks'] as CharacterCategory[]).map((category) => (
          <CharacterSection
            activeId={activeCharacters[category]}
            activeTab={characterTabs[category]}
            category={category}
            key={category}
            onPick={(id) => {
              setActiveCharacters((current) => ({ ...current, [category]: id }))
              setCharacterTabs((current) => ({ ...current, [category]: 'description' }))
            }}
            onTab={(tab) => setCharacterTabs((current) => ({ ...current, [category]: tab }))}
            profiles={characters.filter((character) => character.category === category)}
          />
        ))}
      </section>

      <section className="section" id="score">
        <SectionTitle eyebrow="Original score" title="Score Console" copy="One central music player with album-style covers, not separate oversized blocks." />
        <ScoreConsole activeTrack={activeTrack} onSelect={setActiveTrack} tracks={tracks} />
      </section>

      <section className="section" id="book">
        <SectionTitle eyebrow="Interactive story bible" title="The Magic Book" copy="Readable pages inside the site, dark or light mode, act jumps, and direct page navigation." />
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
        <SectionTitle eyebrow="Consumer products" title="Merchandise Campaign" copy="First premium product concepts for dolls, plush companions, villain packs, jewelry-toys, and electronic creature sets." />
        <div className="merch-campaigns">
          {merchProducts.map((product, index) => {
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
                  <span>{product.subtitle}</span>
                  <h3>{product.title}</h3>
                  <p>{product.copy}</p>
                  <ul>
                    {product.features.map((feature) => <li key={feature}>{feature}</li>)}
                  </ul>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="section contact-section" id="contact">
        <SectionTitle eyebrow="Contact" title="BrightBox Animations" copy="Based between Spain and Los Angeles for festival conversations, co-production, music, animation, and distribution partnerships." />
        <div className="contact-panel glass">
          <div>
            <h3>Spain / Los Angeles</h3>
            <p>Interactive production route for BrightBox Animations, based in Spain and Los Angeles.</p>
            <div className="contact-details">
              <span>Spain: Madrid / Barcelona creative base</span>
              <span>Los Angeles: 1111 Sunset Blvd, Los Angeles, CA</span>
              <span>Fantastic film animation, music, cinematic AI production</span>
            </div>
            <div className="social-row">
              <a href="https://youtube.com" aria-label="YouTube">YT</a>
              <a href="https://instagram.com" aria-label="Instagram">IG</a>
              <a href="https://x.com" aria-label="X">X</a>
            </div>
            <a className="gold-button" href="mailto:brightbox.animations@gmail.com">brightbox.animations@gmail.com</a>
          </div>
          <WorldMap focus={mapFocus} onFocus={setMapFocus} />
        </div>
      </section>
      <footer className="site-footer">
        © 2025–2026 BrightBox Animation Studios. All rights reserved.
      </footer>
    </main>
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

function SectionTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="section-title">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  )
}

type MoodboardItem = { id: string; url: string; x: number; y: number; width: number; height: number; name: string; group?: string };

function MoodboardCanvas() {
  const [items, setItems] = useState<MoodboardItem[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.target === canvasRef.current)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedItem(null);
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
    setSelectedItem(item.id);
    setDraggingItem(item.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldX = (e.clientX - rect.left - pan.x) / zoom;
    const worldY = (e.clientY - rect.top - pan.y) / zoom;
    setDragOffset({ x: worldX - item.x, y: worldY - item.y });
  };

  const addImage = (file: File) => {
    const url = URL.createObjectURL(file);
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
    files.forEach(addImage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItem) {
      setItems(prev => prev.filter(item => item.id !== selectedItem));
      setSelectedItem(null);
    }
  };

  return (
    <div className="storyboard-stage moodboard-canvas-wrapper" style={{ position: 'relative', overflow: 'hidden', flex: 1, minHeight: '600px' }} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onDrop={handleDrop} onDragOver={e => e.preventDefault()} onKeyDown={handleKeyDown} onContextMenu={e => e.preventDefault()} tabIndex={0} ref={canvasRef}>
      <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 20, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: 'var(--gold)', fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: '1.3rem' }}>Moodboard Canvas</h2>
        <button onClick={() => fileInputRef.current?.click()} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid rgba(248, 217, 120, 0.3)', background: 'rgba(248, 217, 120, 0.08)', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.8rem', backdropFilter: 'blur(10px)' }}>+ Add Image</button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { if (e.target.files) Array.from(e.target.files).forEach(addImage); }} />
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Zoom: {Math.round(zoom * 100)}% | {items.length} items</span>
      </div>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: `${20 * zoom}px ${20 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }} />
      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', position: 'absolute', top: 0, left: 0 }}>
        {items.map(item => (
          <div key={item.id} onMouseDown={(e) => handleItemMouseDown(e, item)} style={{ position: 'absolute', left: item.x, top: item.y, width: item.width, cursor: draggingItem === item.id ? 'grabbing' : 'grab', border: selectedItem === item.id ? '2px solid var(--gold)' : '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', boxShadow: selectedItem === item.id ? '0 0 20px rgba(248, 217, 120, 0.3)' : '0 4px 15px rgba(0,0,0,0.5)', transition: draggingItem === item.id ? 'none' : 'box-shadow 0.2s, border-color 0.2s', background: 'rgba(10, 15, 25, 0.8)' }}>
            <img src={item.url} alt={item.name} style={{ width: '100%', display: 'block', pointerEvents: 'none' }} draggable={false} />
            <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
          </div>
        ))}
      </div>
      {items.length === 0 && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: '1rem' }}><rect x="10" y="10" width="20" height="14" rx="2" /><rect x="34" y="10" width="20" height="20" rx="2" /><rect x="10" y="28" width="20" height="26" rx="2" /><rect x="34" y="34" width="20" height="20" rx="2" /></svg>
          <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem' }}>Drop images here or click "+ Add Image"</p>
          <p style={{ fontSize: '0.8rem' }}>Scroll to zoom • Drag canvas to pan • Drag images to position</p>
        </div>
      )}
    </div>
  );
}

function StoryboardWorkspace() {
  const [storyboard, setStoryboard] = useState<StoryboardData>(createDefaultStoryboard)
  const [activeActId, setActiveActId] = useState('act-1')
  const [activeSceneByAct, setActiveSceneByAct] = useState<Record<string, string>>({})
  const [workspaceMode, setWorkspaceMode] = useState<'storyboard' | StoryboardResourceType | 'agent' | 'moodboard'>('storyboard')
  const [newResourceName, setNewResourceName] = useState('')
  const [agentDraft, setAgentDraft] = useState({ title: '', sceneHint: '', skillHint: '', prompt: '' })
  const [lightbox, setLightbox] = useState<StoryboardMedia | null>(null)
  const [status, setStatus] = useState('Loading storyboard archive...')
  const saveTimer = useRef<number | null>(null)

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
        if (!payload.acts?.length || !payload.resources) saveStoryboard(next)
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
    const name = newResourceName.trim()
    if (!name) return
    updateStoryboard((draft) => {
      if (draft.resources[type].some((resource) => resource.name.toLowerCase() === name.toLowerCase())) return
      draft.resources[type].push(createResource(type, name))
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
      shots.push(createShot(shots.length + 1, getMediaTypeForMode(mode)))
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

  const deleteShotMedia = (actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string, mediaId: string) => {
    updateShot(actId, sceneId, mode, shotId, (shot) => {
      shot.media = shot.media.filter((media) => media.id !== mediaId)
      if (shot.selectedMediaId === mediaId) shot.selectedMediaId = shot.media[0]?.id
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
      const refs = scene.resourceRefs[type]
      if (refs.includes(resourceId)) scene.resourceRefs[type] = refs.filter((id) => id !== resourceId)
      else refs.push(resourceId)
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
        ) : (
          <div>
            <p className="eyebrow">Production board</p>
            <h1>Act-by-act cinematic storyboard</h1>
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

        {workspaceMode === 'agent' ? (
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
            onLightbox={setLightbox}
            onNameChange={setNewResourceName}
            onResourceChange={updateResource}
            onUpload={uploadResourceMedia}
            resources={storyboard.resources[workspaceMode]}
            type={workspaceMode}
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
                onLightbox={setLightbox}
                onReorder={reorderShot}
                onShotChange={updateShot}
                onUpload={uploadMedia}
              />
            ) : activeScene.mode === 'moodboards' ? (
              <div className="scene-resources" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'rgba(255,255,255,0.4)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '1rem', marginTop: '1rem' }}>
                [Infinite Moodboard Canvas Placeholder]
              </div>
            ) : (
              <div className="scene-resources">
                <SceneResourcePanel
                  onCopyPath={revealPath}
                  onLightbox={setLightbox}
                  onToggle={toggleSceneResource}
                  refs={activeScene.resourceRefs[activeScene.mode]}
                  resources={storyboard.resources[activeScene.mode]}
                  type={activeScene.mode}
                />
              </div>
            )}
          </div>
        )}
      </section>

      {lightbox && (
        <div className="storyboard-lightbox" onClick={() => setLightbox(null)} role="presentation">
          <button aria-label="Close preview" onClick={() => setLightbox(null)} type="button">×</button>
          {lightbox.type === 'video' && <video src={lightbox.url} controls autoPlay />}
          {lightbox.type === 'audio' && <div className="audio-lightbox"><CustomAudioPlayer url={lightbox.url} fileName={lightbox.fileName} autoPlay /></div>}
          {lightbox.type === 'image' && <img src={lightbox.url} alt={lightbox.fileName} />}
          <a href={lightbox.url} download={lightbox.fileName}>Download original</a>
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
  const [dragBox, setDragBox] = useState<{startX:number;startY:number;endX:number;endY:number}|null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const galleryRef = useRef<HTMLDivElement>(null)
  const [enhanceOpen, setEnhanceOpen] = useState(false)
  const [enhancePrompt, setEnhancePrompt] = useState("Use exact @img1 image 1 but improve quality of character(s), objects and resolution. Do not change camera angle, composition, architecture or objects. The characters should remain in same poses and all objects in the same places. Camera should remain same angle exact the same as @img1 only improve quality. Style: 3d animated movie, cinematic AAA level 3d animation")
  const [enhanceModels, setEnhanceModels] = useState<Record<string,boolean>>({ 'seedream-4.5': true, 'gpt-image-2.0': false, 'gemini-3.1-flash': true })
  const [splitGridType, setSplitGridType] = useState<string>('2x2')
  const [splitDropdownOpen, setSplitDropdownOpen] = useState(false)
  const [splitProgress, setSplitProgress] = useState<{current:number;total:number;panels:number}|null>(null)
  const [processingPassId, setProcessingPassId] = useState<string | null>(null)
  const isProcessingRef = useRef(false)

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

    // 1) SPLIT GRID — batch API
    const splitImages = (task.generatedImages || []).filter(i => i.splitGrid)
    if (splitImages.length > 0) {
      try {
        const res = await fetch('/api/skills/split-grid-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: splitImages.map(i => ({ id: i.id, url: i.url, splitType: (i as any).splitType || '2x2' })) }),
        })
        const data = await res.json()
        if (data.ok && data.panels && data.panels.length > 0) {
          // Build new pass
          const newPass = { id: `pass-${nextPassNum}`, name: `Pass ${nextPassNum} — Split Grid (${data.panels.length} panels)`, images: data.panels }
          onTaskChange(task.id, (draft) => {
            draft.status = 'pass' as any
            // Read fresh passes from draft (not stale snapshot) to avoid overwriting other passes
            const freshPasses = (draft.passes || []).map(p => {
              if (p.id === activePass) {
                return { ...p, images: (p.images || []).map((i: any) => ({ ...i, splitGrid: false, improve4k: false, splitType: undefined })) }
              }
              return p
            })
            draft.passes = [...freshPasses, newPass]
            draft.activePassId = newPass.id
            draft.generatedImages = data.panels
          })
          // Also persist to disk
          onTaskChange(task.id, (draft) => {
            fetch('/api/tasks/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: task.id, status: 'pass', passes: draft.passes, activePassId: draft.activePassId, generatedImages: draft.generatedImages }),
            }).catch(() => {})
          })
        } else {
          onTaskChange(task.id, (draft) => { draft.status = 'pass' as any })
        }
      } catch {
        onTaskChange(task.id, (draft) => { draft.status = 'pass' as any })
      }
      isProcessingRef.current = false
      setProcessingPassId(null)
      return
    }

    // 2) ENHANCE QUALITY — per-image API
    const improveImages = (task.generatedImages || []).filter(i => i.improve4k)
    if (improveImages.length > 0) {
      const allResults: any[] = []
      const models = improveImages[0]?.improveModel?.split(',') || ['seedream-4.5', 'gemini-3.1-flash']
      const userPrompt = improveImages[0]?.improvePrompt || enhancePrompt
      for (const img of improveImages) {
        for (const model of models) {
          const modelQuality: Record<string,string> = { 'seedream-4.5': '2160p', 'gpt-image-2.0': '1440p', 'gemini-3.1-flash': '2160p', 'gemini-3.0': '1440p', 'kling-image-v3': '2160p' }
          try {
            const res = await fetch('/api/skills/enhance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imagePath: img.url, prompt: userPrompt, model, quality: modelQuality[model] || '2160p', aspectRatio: '16:9' }),
            })
            const data = await res.json()
            if (data.ok) {
              allResults.push({
                id: `enhanced-${img.id}-${model}-${Date.now()}`,
                url: data.url,
                note: `${model} ${data.quality} enhanced`,
                selected: false, improve4k: false, splitGrid: false,
              })
            }
          } catch { /* continue */ }
        }
      }
      if (allResults.length > 0) {
        const newPass = { id: `pass-${nextPassNum}`, name: `Pass ${nextPassNum} — Enhanced (${allResults.length} images)`, images: allResults }
        onTaskChange(task.id, (draft) => {
          draft.status = 'pass' as any
          draft.passes = [...(draft.passes || []), newPass]
          draft.activePassId = newPass.id
          draft.generatedImages = allResults
        })
        fetch('/api/tasks/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: task.id, status: 'pass', passes: [...currentPasses, newPass], activePassId: newPass.id, generatedImages: allResults }),
        }).catch(() => {})
      } else {
        onTaskChange(task.id, (draft) => { draft.status = 'pass' as any })
      }
      isProcessingRef.current = false
      setProcessingPassId(null)
      return
    }

    // 3) GENERAL TASK — save to disk and start polling
    onTaskChange(task.id, (draft) => { 
      draft.status = 'pass_working' as any;
      draft.updatedAt = new Date().toISOString();
    })

    fetch('/api/tasks/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, title: task.title, prompt: task.prompt, sceneHint: task.sceneHint, skillHint: task.skillHint, status: 'pass_working', createdAt: task.createdAt, updatedAt: new Date().toISOString(), passes: currentPasses, generatedImages: task.generatedImages || [] }),
    }).catch(() => {})

    isProcessingRef.current = false
    setProcessingPassId(null)
  }

  // useEffect ONLY for polling external agent responses (general tasks)
  useEffect(() => {
    if (task.status.endsWith('_working')) {
      // Only poll — no skill execution here
      const splitImages = (task.generatedImages || []).filter(i => i.splitGrid)
      const improveImages = (task.generatedImages || []).filter(i => i.improve4k)
      if (splitImages.length > 0 || improveImages.length > 0) return // Skills handled by handleRunAgent

      const currentPasses = task.passes || []
      const currentPassCount = currentPasses.length
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/tasks/poll?id=${task.id}`)
          if (!res.ok) return
          const data = await res.json()
          if (!data.found || !data.task) return
          const fileTask = data.task

          if (fileTask.passes && fileTask.passes.length > currentPassCount) {
            const latestPass = fileTask.passes[fileTask.passes.length - 1]
            if (latestPass.images && latestPass.images.length > 0) {
              onTaskChange(task.id, (draft) => {
                draft.status = 'pass' as any
                draft.passes = fileTask.passes
                draft.activePassId = latestPass.id
                draft.generatedImages = latestPass.images
              })
              clearInterval(interval)
            }
          }

          if (fileTask.status && fileTask.status !== task.status && !fileTask.status.endsWith('_working')) {
            onTaskChange(task.id, (draft) => {
              draft.status = fileTask.status
              if (fileTask.passes) draft.passes = fileTask.passes
              if (fileTask.generatedImages) draft.generatedImages = fileTask.generatedImages
              if (fileTask.activePassId) draft.activePassId = fileTask.activePassId
            })
            clearInterval(interval)
          }
        } catch { /* continue polling */ }
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [task.status, task.id, onTaskChange])

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

  // Rubber band drag selection handlers
  const handleGalleryMouseDown = (e: React.MouseEvent) => {
    if (!multiSelectMode || !galleryRef.current) return
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.expanded-tools')) return
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
    // Find which gallery items intersect the drag box
    const items = galleryRef.current.querySelectorAll('.gallery-item')
    const containerRect = galleryRef.current.getBoundingClientRect()
    const boxLeft = Math.min(dragBox.startX, dragBox.endX)
    const boxRight = Math.max(dragBox.startX, dragBox.endX)
    const boxTop = Math.min(dragBox.startY, dragBox.endY)
    const boxBottom = Math.max(dragBox.startY, dragBox.endY)
    // Only proceed if drag was more than 10px
    if (Math.abs(dragBox.endX - dragBox.startX) > 10 && Math.abs(dragBox.endY - dragBox.startY) > 10) {
      const intersectingIds: string[] = []
      items.forEach(item => {
        const r = item.getBoundingClientRect()
        const scrollTop = galleryRef.current!.scrollTop || 0
        const itemLeft = r.left - containerRect.left
        const itemTop = r.top - containerRect.top + scrollTop
        const itemRight = itemLeft + r.width
        const itemBottom = itemTop + r.height
        if (itemLeft < boxRight && itemRight > boxLeft && itemTop < boxBottom && itemBottom > boxTop) {
          const imgEl = item.querySelector('img')
          const key = item.getAttribute('data-img-id')
          if (key) intersectingIds.push(key)
        }
      })
      if (intersectingIds.length > 0) {
        setSelectedImageIds(prev => {
          const newSet = new Set(prev)
          intersectingIds.forEach(id => newSet.add(id))
          return Array.from(newSet)
        })
      }
    }
    setIsDragging(false)
    setDragBox(null)
  }

  const [assignMenu, setAssignMenu] = useState<'scene' | 'actor' | 'prop' | 'location' | 'style' | 'image' | null>(null)
  const [assignName, setAssignName] = useState('')
  const [assignSceneId, setAssignSceneId] = useState('')

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
          <button type="button" title="Edit (Send to Pass 1)" onClick={() => onTaskChange(task.id, draft => { draft.status = 'pass1' })} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button type="button" title="Delete" onClick={() => {}} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,42,85,0.7)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
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
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', whiteSpace: 'nowrap', paddingTop: '0.3rem' }}>{new Date(task.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: '1.5', flex: 1, overflowY: 'auto', wordBreak: 'break-word', whiteSpace: 'pre-wrap', marginBottom: '0.5rem', paddingRight: '0.5rem' }}>
          {task.prompt}
        </div>

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

        <div className="task-actions-text" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: 'auto' }}>
          <button type="button" onClick={() => {
            onTaskChange(task.id, draft => { draft.status = 'todo_working' as any })
            // Also write to disk so the poller can find it
            fetch('/api/tasks/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: task.id, status: 'todo_working', updatedAt: new Date().toISOString() }),
            }).catch(() => {})
          }} style={{ fontSize: '0.9rem', padding: '0.8rem 1.5rem', background: 'rgba(248, 217, 120, 0.1)', color: 'var(--gold)', border: '1px solid rgba(248, 217, 120, 0.3)', borderRadius: '2rem', fontWeight: 600, flex: 1, display: 'flex', justifyContent: 'center', transition: 'all 0.2s' }}>Start Task</button>
          
          <button type="button" title="Make Blueprint" onClick={() => onSaveBlueprint?.(task)} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} className="queue-action-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </button>

          <button type="button" title="Edit" onClick={() => onEditTask?.(task)} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} className="queue-action-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>

          <button type="button" title="Delete" onClick={() => { onTaskChange(task.id, draft => { draft.status = 'archived' }); fetch('/api/tasks/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id }) }).catch(() => {}); }} style={{ padding: '0.5rem', background: 'transparent', color: 'rgba(255,42,85,0.7)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} className="queue-action-btn">
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
              <div className="holographic-loader" style={{ marginTop: '1rem' }}>
                <div className="scanner-line"></div>
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
        <div className="task-passes-subtabs" style={{ display: 'flex', gap: '0.5rem', padding: '1rem 1rem 0 1rem', position: 'relative', zIndex: 200 }}>
          {task.passes.map(p => (
            <button key={p.id} className={`pass-tab ${task.activePassId === p.id ? 'is-active' : ''}`} onClick={() => {
              // Reset multi-select state when switching passes
              setMultiSelectMode(false)
              setSelectedImageIds([])
              setSplitDropdownOpen(false)
              setEnhanceOpen(false)
              setExpandedImageId(null)
              onTaskChange(task.id, draft => { draft.activePassId = p.id; draft.generatedImages = draft.passes?.find(x => x.id === p.id)?.images || [] })
            }} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px 8px 0 0', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', color: task.activePassId === p.id ? 'var(--gold)' : 'rgba(255,255,255,0.6)', background: task.activePassId === p.id ? 'rgba(248, 217, 120, 0.05)' : 'rgba(0,0,0,0.2)', cursor: 'pointer', fontSize: '0.85rem', position: 'relative', top: '1px', zIndex: task.activePassId === p.id ? 2 : 1 }}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {(!task.generatedImages || task.generatedImages.length === 0) ? (
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
                      const note = prompt('Add note to all selected images:')
                      if (note !== null) {
                        onTaskChange(task.id, draft => { 
                          if (draft.passes) {
                            const pIdx = draft.passes.findIndex(p => p.id === draft.activePassId);
                            if (pIdx !== -1 && draft.passes[pIdx].images) {
                              draft.passes[pIdx].images = draft.passes[pIdx].images.map(i => 
                                selectedImageIds.includes(i.id) ? { ...i, note } : i
                              );
                            }
                          }
                          if (draft.generatedImages) {
                            draft.generatedImages = draft.generatedImages.map(i => 
                              selectedImageIds.includes(i.id) ? { ...i, note } : i
                            );
                          }
                        })
                      }
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
                    const improveModelStr = Object.entries(enhanceModels).filter(([,v]) => v).map(([k]) => k).join(',');
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

          <div className="generated-gallery" ref={galleryRef} style={{ position: 'relative', userSelect: multiSelectMode ? 'none' : 'auto' }} onMouseDown={handleGalleryMouseDown} onMouseMove={handleGalleryMouseMove} onMouseUp={handleGalleryMouseUp} onMouseLeave={handleGalleryMouseUp}>
            {/* Rubber band drag overlay */}
            {isDragging && dragBox && (
              <div style={{ position: 'absolute', left: Math.min(dragBox.startX, dragBox.endX), top: Math.min(dragBox.startY, dragBox.endY), width: Math.abs(dragBox.endX - dragBox.startX), height: Math.abs(dragBox.endY - dragBox.startY), background: 'rgba(248, 217, 120, 0.08)', border: '2px solid rgba(248, 217, 120, 0.4)', borderRadius: '4px', pointerEvents: 'none', zIndex: 100 }} />
            )}
            {task.generatedImages.filter(img => !img.assignedType).map((img) => {
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
                  {isMultiSelected && <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', zIndex: 5, width: '24px', height: '24px', borderRadius: '50%', background: 'var(--gold)', display: 'grid', placeItems: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>}
                  <img src={img.url} alt="Generated Draft" />
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
                        <div className="floating-note-area glass">
                          <textarea
                            placeholder="Leave an iteration note..."
                            value={img.note || ''}
                            rows={2}
                            onChange={(e) => {
                              e.target.style.height = 'auto'
                              e.target.style.height = e.target.scrollHeight + 'px'
                              onTaskChange(task.id, (draft) => {
                                const dImg = draft.generatedImages?.find(i => i.id === img.id)
                                if (dImg) dImg.note = e.target.value
                              })
                            }}
                          />
                          <button className="tick-save-btn" onClick={() => onTaskChange(task.id, (draft) => { const i = draft.generatedImages?.find(x => x.id === img.id); if (i) i.noteActive = false; })}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </button>
                        </div>
                      )}

                      {img.assignMenuOpen && !isAssigned && (
                        <div className="assign-menu-glass glass">
                          <div className="assign-menu-title">Assign Asset</div>
                          <div className="assign-type-row">
                            {['image', 'prop', 'actor', 'location', 'style'].map((t) => (
                              <button key={t} className={`type-btn ${assignMenu === t ? 'is-active' : ''}`} onClick={() => setAssignMenu(t as any)}>
                                {t}
                              </button>
                            ))}
                          </div>
                          {assignMenu && (
                            <div className="assign-menu-body">
                              <input type="text" placeholder={`Type ${assignMenu} name...`} className="assign-name-input" value={assignName} onChange={e => setAssignName(e.target.value)} />
                              <div className="assign-scene-scroll">
                                {data.acts.map(act => (
                                  <div key={act.id} className="scene-scroll-group">
                                    <div className="scene-scroll-act">{act.title}</div>
                                    {act.scenes.map(s => (
                                      <button key={s.id} className={assignSceneId === s.id ? 'is-active' : ''} onClick={() => setAssignSceneId(s.id)}>{s.title}</button>
                                    ))}
                                  </div>
                                ))}
                              </div>
                              <div className="assign-keep-row">
                                <button className="keep-image-btn" onClick={() => {
                                  if (onAssignAsset) onAssignAsset(assignMenu, assignName, assignSceneId, img.url);
                                  onTaskChange(task.id, (draft) => {
                                    const dImg = draft.generatedImages?.find(i => i.id === img.id)
                                    if (dImg) { dImg.assignedType = assignMenu; dImg.assignedName = assignName || "Assigned Asset"; dImg.assignMenuOpen = false; dImg.selected = true; }
                                  })
                                  setAssignMenu(null);
                                  setAssignName('');
                                  setAssignSceneId('');
                                }}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

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
                            <button className="keep-image-btn" onClick={() => onTaskChange(task.id, draft => {
                              const dImg = draft.generatedImages?.find(i => i.id === img.id);
                              if (dImg) { dImg.improve4k = true; dImg.improveMenuOpen = false; }
                            })}>
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
            })}
          </div>
          {/* Beautiful processing overlay — ONLY on the pass being processed */}
          {processingPassId && task.activePassId === processingPassId && (() => {
            const splitCount = task.generatedImages.filter(i => i.splitGrid).length
            const enhanceCount = task.generatedImages.filter(i => i.improve4k).length
            const activeCount = splitCount + enhanceCount
            if (activeCount === 0 && !isProcessingRef.current) return null;
            const activeTask = splitCount > 0 ? 'Splitting grids' : enhanceCount > 0 ? 'Enhancing quality' : 'Processing task'
            const estTime = splitCount > 0 ? Math.round(splitCount * 5) : enhanceCount > 0 ? Math.round(enhanceCount * 30) : 0
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
                </div>
                <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                    {splitProgress ? `${splitProgress.current}/${splitProgress.total} processed • ${splitProgress.panels} panels created` : `${activeCount} images queued${estTime > 0 ? ` • ~${estTime < 60 ? estTime + 's' : Math.round(estTime / 60) + 'min'} estimated` : ''}`}
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
  const [activeTab, setActiveTab] = useState<'todo' | 'pass1' | 'pass2' | 'archived'>('pass1')
  const [activeTaskIds, setActiveTaskIds] = useState<Record<string, string>>({})
  const [mediaTab, setMediaTab] = useState<'images' | 'videos'>('images')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showBlueprintGallery, setShowBlueprintGallery] = useState(false)
  const [blueprintSaveModal, setBlueprintSaveModal] = useState<AgentTask | null>(null)
  const [savedBlueprints, setSavedBlueprints] = useState<any[]>([
    { id: 'bp-1', title: 'Aisha Close-Up Sequence', prompt: 'Cinematic close-up of Aisha looking determined, neon rain, anamorphic lens flare.', sceneHint: 'Act 1 - Scene 1', skillHint: 'Cinematography' },
    { id: 'bp-2', title: 'Desert Palace Wide', prompt: 'Extreme wide shot of the Bedouin palace at sunset, sand particles in the wind.', sceneHint: 'Act 2 - Scene 3', skillHint: '' }
  ])
  const [composerTab, setComposerTab] = useState<'task' | 'promptBuilder'>('task')
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)
  const [archiveSearch, setArchiveSearch] = useState('')
  const [agentHistory, setAgentHistory] = useState<AgentMessage[]>([])
  const [agentInput, setAgentInput] = useState('')
  const [agentLoading, setAgentLoading] = useState(false)

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
        <div className="mindtree-overlay">
          <div className="mindtree-modal glass">
            <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            <h2>Director's Visual Assignment</h2>
            <p className="eyebrow">Select a target node in the Mind Tree</p>
            <div className="mindtree-acts">
              {data.acts.map(act => (
                <div key={act.id} className="mindtree-act">
                  <h3>{act.title || `Act`}</h3>
                  <div className="mindtree-scenes">
                    {act.scenes.map((scene, i) => (
                      <button key={scene.id} className="mindtree-scene-btn glass" onClick={() => {
                        onDraftChange({ ...draft, sceneHint: `${act.title || 'Act'} - ${scene.title || `Scene ${i + 1}`}` })
                        setIsModalOpen(false)
                      }}>
                        {scene.title || `Scene ${i + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
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
        <div className="mindmap-main-node task-form-glass" style={{ flex: 2, padding: '2rem' }}>
          <div className="node-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <input placeholder="Task Title (e.g. Master Shot 01)" value={draft.title} onChange={(event) => onDraftChange({ ...draft, title: event.target.value })} className="node-title-input" />
          </div>

          {/* Composer Tabs: Task / Prompt Builder */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button type="button" onClick={() => setComposerTab('task')} style={{ padding: '0.5rem 1.2rem', borderRadius: '2rem', border: composerTab === 'task' ? '1px solid rgba(248, 217, 120, 0.5)' : '1px solid rgba(255,255,255,0.1)', background: composerTab === 'task' ? 'rgba(248, 217, 120, 0.08)' : 'transparent', color: composerTab === 'task' ? 'var(--gold)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s' }}>
              <span style={{ marginRight: '0.4rem' }}>✍️</span> Task
            </button>
            <button type="button" onClick={() => setComposerTab('promptBuilder')} style={{ padding: '0.5rem 1.2rem', borderRadius: '2rem', border: composerTab === 'promptBuilder' ? '1px solid rgba(248, 217, 120, 0.5)' : '1px solid rgba(255,255,255,0.1)', background: composerTab === 'promptBuilder' ? 'rgba(248, 217, 120, 0.08)' : 'transparent', color: composerTab === 'promptBuilder' ? 'var(--gold)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s' }}>
              <span style={{ marginRight: '0.4rem' }}>🧩</span> Prompt Builder
            </button>
            {/* Dictation Button */}
            <button type="button" title={isRecording ? "Stop Dictation" : "Start Dictation"} onClick={() => {
              if (isRecording && recognitionRef.current) {
                recognitionRef.current.stop();
                setIsRecording(false);
              } else {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (!SpeechRecognition) { alert('Speech recognition is not supported in this browser.'); return; }
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';
                recognition.onresult = (event: any) => {
                  let transcript = '';
                  for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                  }
                  if (event.results[event.results.length - 1].isFinal) {
                    onDraftChange({ ...draft, prompt: draft.prompt + ' ' + transcript });
                  }
                };
                recognition.onerror = () => setIsRecording(false);
                recognition.onend = () => setIsRecording(false);
                recognition.start();
                recognitionRef.current = recognition;
                setIsRecording(true);
              }
            }} style={{ marginLeft: 'auto', padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px', border: isRecording ? '2px solid #ff2a55' : '1px solid rgba(255,255,255,0.15)', background: isRecording ? 'rgba(255, 42, 85, 0.15)' : 'transparent', color: isRecording ? '#ff2a55' : 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'grid', placeItems: 'center', transition: 'all 0.3s', animation: isRecording ? 'pulse-recording 1.5s infinite' : 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </button>
          </div>

          {composerTab === 'task' ? (
            <textarea placeholder="Write the highly detailed task for the agent. Specify framing, lighting, motion, and exact skills..." value={draft.prompt} onChange={(event) => onDraftChange({ ...draft, prompt: event.target.value })} className="node-prompt-input" style={{ minHeight: '350px' }} />
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
            </div>
          )}

          <div className="task-attachment-preview">
            {draft.sceneHint && (
              <div className="preview-icon-chip">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                {draft.sceneHint}
              </div>
            )}
            {draft.skillHint && (
              <div className="preview-icon-chip">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                {draft.skillHint}
              </div>
            )}
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0 0 1rem 0' }} />
          <div className="node-footer" style={{ position: 'relative', right: 0, bottom: 0 }}>
            <button className="execute-task-btn" onClick={onAdd} type="button">
              Launch Agent Pipeline <span>⚡️</span>
            </button>
          </div>
        </div>

        <div className="mindmap-attachment-nodes" style={{ flex: 1, gap: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div className="attachment-node glass scene-node" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '1rem', width: '100%' }}>
            <p className="eyebrow">Target Scene</p>
            <input placeholder="e.g. Act 1 Scene 2" value={draft.sceneHint} onChange={(event) => onDraftChange({ ...draft, sceneHint: event.target.value })} />
            <button className="attach-btn" type="button" onClick={() => setIsModalOpen(true)}>Link Visual Node</button>
          </div>
          <div className="attachment-node glass skill-node" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '1rem', width: '100%' }}>
            <p className="eyebrow">Agent Skills</p>
            <input placeholder="e.g. Grid Splitter, Camera Pan" value={draft.skillHint} onChange={(event) => onDraftChange({ ...draft, skillHint: event.target.value })} />
            <label className="attach-btn" style={{ textAlign: 'center', display: 'block' }}>
              Load Skill.md
              <input type="file" accept=".md" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'skill')} />
            </label>
          </div>
          <div className="attachment-node glass ref-node" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '1rem', width: '100%' }}>
            <p className="eyebrow">References & PDFs</p>
            <label className="placeholder-dropzone" style={{ display: 'block' }}>
              Drop PDF / Image Here
              <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'ref')} />
            </label>
          </div>

          {/* AI Agent Quick Actions */}
          <div className="attachment-node glass" style={{ border: '1px solid rgba(248, 217, 120, 0.1)', background: 'rgba(248, 217, 120, 0.02)', padding: '1.5rem', borderRadius: '1rem', width: '100%' }}>
            <p className="eyebrow" style={{ color: 'var(--gold)' }}>🧠 Theo Agent</p>
            <button type="button" disabled={agentLoading} onClick={async () => {
              if (!draft.prompt.trim()) return;
              setAgentLoading(true);
              const result = await refinePrompt(draft.prompt, 'Make it more cinematic, add specific camera lens, lighting, and quality boosters');
              if (!result.error) onDraftChange({ ...draft, prompt: result.text });
              setAgentLoading(false);
            }} style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid rgba(248, 217, 120, 0.2)', background: 'rgba(248, 217, 120, 0.05)', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.8rem', marginBottom: '0.5rem', transition: 'all 0.2s' }}>
              {agentLoading ? '⏳ Refining...' : '✨ AI Refine Prompt'}
            </button>
            <button type="button" disabled={agentLoading} onClick={async () => {
              if (!draft.title.trim()) return;
              setAgentLoading(true);
              const result = await generatePrompt(draft.title, 'cinematic Pixar 3D animation, AAA quality');
              if (!result.error) onDraftChange({ ...draft, prompt: result.text });
              setAgentLoading(false);
            }} style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.8rem', marginBottom: '0.8rem', transition: 'all 0.2s' }}>
              {agentLoading ? '⏳ Generating...' : '🎬 AI Generate from Title'}
            </button>

            {/* Agent Chat */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem' }}>
              <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {agentHistory.map((msg, i) => (
                  <div key={i} style={{ padding: '0.5rem 0.7rem', borderRadius: '0.5rem', fontSize: '0.78rem', lineHeight: '1.4', background: msg.role === 'user' ? 'rgba(248, 217, 120, 0.08)' : 'rgba(255,255,255,0.03)', color: msg.role === 'user' ? 'var(--gold)' : 'rgba(255,255,255,0.7)', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', whiteSpace: 'pre-wrap' }}>
                    {msg.parts[0].text.substring(0, 300)}{msg.parts[0].text.length > 300 ? '...' : ''}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input type="text" placeholder="Ask Theo..." value={agentInput} onChange={e => setAgentInput(e.target.value)} onKeyDown={async (e) => {
                  if (e.key === 'Enter' && agentInput.trim()) {
                    const msg = agentInput;
                    setAgentInput('');
                    setAgentLoading(true);
                    const result = await chatWithAgent(msg, agentHistory);
                    if (!result.error) setAgentHistory(result.updatedHistory);
                    setAgentLoading(false);
                  }
                }} style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2rem', padding: '0.4rem 0.8rem', color: 'white', fontSize: '0.78rem' }} />
                <button type="button" disabled={agentLoading || !agentInput.trim()} onClick={async () => {
                  const msg = agentInput;
                  setAgentInput('');
                  setAgentLoading(true);
                  const result = await chatWithAgent(msg, agentHistory);
                  if (!result.error) setAgentHistory(result.updatedHistory);
                  setAgentLoading(false);
                }} style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', border: 'none', background: 'var(--gold)', color: '#000', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                  {agentLoading ? '...' : '→'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="agent-pipeline-board">
        <div className="pipeline-tabs">
          <button className={`pipeline-tab ${activeTab === 'todo' ? 'is-active' : ''}`} onClick={() => setActiveTab('todo')}>
            Queue ({tasks.filter(t => t.status === 'todo' || t.status === 'todo_working').length})
          </button>
          <button className={`pipeline-tab ${activeTab === 'edit' ? 'is-active' : ''}`} onClick={() => setActiveTab('edit')}>
            Edit ({tasks.filter(t => t.status.startsWith('pass') || t.status === 'pass_working').length})
          </button>
          <button className={`pipeline-tab ${activeTab === 'archived' ? 'is-active' : ''}`} onClick={() => setActiveTab('archived')}>
            Archive ({tasks.filter(t => t.status === 'archived').length})
          </button>
        </div>

        <div className="pipeline-content">
          {activeTab === 'todo' && (
            <div className="todo-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 1rem' }}>
                <h3 style={{ color: 'var(--gold)', margin: 0, fontWeight: 500, fontFamily: '"Outfit", sans-serif' }}>Tasks Awaiting Execution</h3>
                <div style={{ position: 'relative' }}>
                  <button type="button" onClick={() => setShowBlueprintGallery(!showBlueprintGallery)} style={{ background: 'rgba(248, 217, 120, 0.1)', color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: '2rem', padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} className="queue-action-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    {showBlueprintGallery ? 'Close Blueprint Library' : 'Start Task from Blueprint'}
                  </button>
                </div>
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
          {activeTab === 'edit' && (
            <div className="edit-container" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="task-horizontal-tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
                {tasks.filter(t => t.status.startsWith('pass') || t.status === 'pass_working').map(task => {
                  const isActive = activeTaskIds['edit'] === task.id || (!activeTaskIds['edit'] && tasks.filter(t => t.status.startsWith('pass') || t.status === 'pass_working')[0]?.id === task.id);
                  return (
                    <button key={task.id} className="task-sub-tab" style={{ padding: '0.5rem 1.5rem', borderRadius: '2rem', border: isActive ? '1px solid rgba(248, 217, 120, 0.5)' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: isActive ? 'rgba(248, 217, 120, 0.05)' : 'rgba(255,255,255,0.02)', color: isActive ? 'var(--gold)' : 'rgba(255,255,255,0.6)', boxShadow: isActive ? '0 0 12px rgba(248, 217, 120, 0.3)' : 'none', textShadow: isActive ? '0 0 8px rgba(248, 217, 120, 0.5)' : 'none', transition: 'all 0.3s ease' }} onClick={() => setActiveTaskIds({ ...activeTaskIds, edit: task.id })}>
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
}: {
  newName: string
  onAdd: (type: StoryboardResourceType) => void
  onBack: () => void
  onCopyPath: (media?: StoryboardMedia) => void
  onDeleteMedia: (type: StoryboardResourceType, resourceId: string, slot: StoryboardResourceSlot, mediaId: string) => void
  onLightbox: (media: StoryboardMedia) => void
  onNameChange: (name: string) => void
  onResourceChange: (type: StoryboardResourceType, resourceId: string, mutate: (resource: StoryboardResource) => void) => void
  onUpload: (file: File, type: StoryboardResourceType, resourceId: string, slot: StoryboardResourceSlot) => void
  resources: StoryboardResource[]
  type: StoryboardResourceType
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
        {resources.map((resource) => (
          <ResourceCard
            key={resource.id}
            onCopyPath={onCopyPath}
            onDeleteMedia={onDeleteMedia}
            onLightbox={onLightbox}
            onResourceChange={onResourceChange}
            onUpload={onUpload}
            resource={resource}
            type={type}
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
}: {
  compact?: boolean
  onCopyPath?: (media?: StoryboardMedia) => void
  onDeleteMedia?: (type: StoryboardResourceType, resourceId: string, slot: StoryboardResourceSlot, mediaId: string) => void
  onLightbox?: (media: StoryboardMedia) => void
  onResourceChange?: (type: StoryboardResourceType, resourceId: string, mutate: (resource: StoryboardResource) => void) => void
  onToggle?: (resourceId: string) => void
  onUpload?: (file: File, type: StoryboardResourceType, resourceId: string, slot: StoryboardResourceSlot) => void
  resource: StoryboardResource
  selected?: boolean
  type: StoryboardResourceType
}) {
  const slot = resource.mode || 'card'
  const media = slot === 'card' ? resource.media : resource.sheetMedia
  const selectedMedia = media.find((item) => item.id === (slot === 'card' ? resource.selectedMediaId : resource.selectedSheetMediaId)) || media[0]
  const fileInputId = `${type}-${resource.id}-${slot}`
  const showAlternatives = !compact && Boolean(resource.expanded && media.length > 0)

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && onUpload) onUpload(file, type, resource.id, slot)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file && onUpload) onUpload(file, type, resource.id, slot)
  }

  return (
    <article className={`resource-card glass ${type} ${compact ? 'is-compact' : ''} ${selected ? 'is-selected' : ''}`}>
      <div className="resource-media" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
        {selectedMedia ? (
          selectedMedia.type === 'video'
            ? <video src={selectedMedia.url} muted playsInline />
            : selectedMedia.type === 'audio'
              ? <CustomAudioPlayer url={selectedMedia.url} fileName={selectedMedia.fileName} />
              : <img src={selectedMedia.url} alt={resource.name} />
        ) : (
          <label htmlFor={fileInputId}>＋</label>
        )}
        {onUpload && <input id={fileInputId} type="file" accept="image/*,video/*" onChange={handleFile} />}
        <div className="shot-tools">
          {onUpload && <label htmlFor={fileInputId} title="Upload reference">＋</label>}
          {onLightbox && <button disabled={!selectedMedia} onClick={() => selectedMedia && onLightbox(selectedMedia)} title="Open large" type="button">⤢</button>}
          {selectedMedia && <a href={selectedMedia.url} download={selectedMedia.fileName} title="Download original">↓</a>}
          {onCopyPath && <button disabled={!selectedMedia?.localPath} onClick={() => onCopyPath(selectedMedia)} title="Reveal in Finder and copy path" type="button">⌁</button>}
          {onResourceChange && <button disabled={media.length < 1} onClick={() => onResourceChange(type, resource.id, (draft) => { draft.expanded = !draft.expanded })} title="Show options" type="button">⋯</button>}
          {onToggle && <button onClick={() => onToggle(resource.id)} title={selected ? 'Remove from scene' : 'Attach to scene'} type="button">{selected ? '✓' : '＋'}</button>}
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
              <button className={slot === 'card' ? 'is-active' : ''} onClick={() => onResourceChange?.(type, resource.id, (draft) => { draft.mode = 'card' })} type="button">{type === 'actors' ? 'Actor card' : 'Card'}</button>
              <button className={slot === 'sheet' ? 'is-active' : ''} onClick={() => onResourceChange?.(type, resource.id, (draft) => { draft.mode = 'sheet' })} type="button">{type === 'locations' ? 'Options' : 'Sheet'}</button>
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
}: {
  onCopyPath: (media?: StoryboardMedia) => void
  onLightbox: (media: StoryboardMedia) => void
  onToggle: (type: StoryboardResourceType, resourceId: string) => void
  refs: string[]
  resources: StoryboardResource[]
  type: StoryboardResourceType
}) {
  const selected = resources.filter((resource) => refs.includes(resource.id))
  const available = resources.filter((resource) => !refs.includes(resource.id))

  return (
    <div className={`scene-resource-panel ${type}`}>
      <div className="scene-resource-copy">
        <p className="tip-text">✨ <strong>{getResourceTypeLabel(type)} attached to this scene</strong> define the local truth for prompting: exact characters, locations, props, and reference paths.</p>
      </div>
      {selected.length > 0 && (
        <div className="resource-grid selected-resources">
          {selected.map((resource) => <ResourceCard compact key={resource.id} onCopyPath={onCopyPath} onLightbox={onLightbox} onToggle={(id) => onToggle(type, id)} resource={resource} selected type={type} />)}
        </div>
      )}
      <div className="resource-grid available-resources">
        {available.map((resource) => <ResourceCard compact key={resource.id} onCopyPath={onCopyPath} onLightbox={onLightbox} onToggle={(id) => onToggle(type, id)} resource={resource} type={type} />)}
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
  onLightbox,
  onReorder,
  onShotChange,
  onUpload,
}: {
  actors: string[]
  actId: string
  scene: StoryboardScene
  mode: StoryboardSequenceMode
  onCopyPath: (media?: StoryboardMedia) => void
  onDeleteMedia: (actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string, mediaId: string) => void
  onDeleteShot: (actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string) => void
  onLightbox: (media: StoryboardMedia) => void
  onReorder: (actId: string, sceneId: string, mode: StoryboardSequenceMode, fromId: string, toId: string) => void
  onShotChange: (actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string, mutate: (shot: StoryboardShot) => void) => void
  onUpload: (file: File, actId: string, sceneId: string, mode: StoryboardSequenceMode, shotId: string) => void
}) {
  const shots = getSceneShots(scene, mode)

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
    const fromId = event.dataTransfer.getData('text/storyboard-shot')
    if (fromId) onReorder(actId, scene.id, mode, fromId, shotId)
  }

  return (
    <div className="shot-grid">
      {shots.map((shot, index) => {
        const selected = shot.media.find((media) => media.id === shot.selectedMediaId) || shot.media[0]
        const dialoguePreview = shot.actor && shot.dialogue ? `${shot.actor.toUpperCase()}: ${shot.dialogue}` : shot.dialogue
        const fileInputId = `${scene.id}-${mode}-${shot.id}`

        return (
          <article
            className="shot-card glass"
            draggable
            key={shot.id}
            onDragStart={(event) => event.dataTransfer.setData('text/storyboard-shot', shot.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, shot.id)}
          >
            {shots.length > 1 && (
              <button aria-label={`Delete ${shot.title}`} className="shot-delete" onClick={() => onDeleteShot(actId, scene.id, mode, shot.id)} title="Remove shot from board" type="button">×</button>
            )}
            <div className="shot-number">{String(index + 1).padStart(2, '0')}</div>
            <div className="shot-media">
              {selected ? (
                selected.type === 'video'
                  ? <video src={selected.url} muted playsInline />
                  : selected.type === 'audio'
                    ? <CustomAudioPlayer url={selected.url} fileName={selected.fileName} />
                    : <img src={selected.url} alt={shot.title} />
              ) : (
                <label htmlFor={fileInputId}>＋</label>
              )}
              <input id={fileInputId} type="file" accept={mode === 'images' ? 'image/*' : mode === 'videos' ? 'video/*' : 'audio/*'} onChange={(event) => handleFile(event, shot.id)} />
              <div className="shot-tools">
                <label htmlFor={fileInputId} title="Upload alternative">+</label>
                <button disabled={!selected} onClick={() => selected && onLightbox(selected)} title="Open large" type="button">⤢</button>
                <a className={!selected ? 'is-disabled' : ''} href={selected?.url || '#'} download={selected?.fileName} title="Download original">↓</a>
                <button disabled={!selected?.localPath} onClick={() => onCopyPath(selected)} title="Reveal in Finder and copy path" type="button">⌁</button>
                <button onClick={() => onShotChange(actId, scene.id, mode, shot.id, (draft) => { draft.expanded = !draft.expanded })} title="Alternatives" type="button">⋯</button>
              </div>
              {selected && (
                <button aria-label="Remove media from board" className="media-delete" onClick={() => onDeleteMedia(actId, scene.id, mode, shot.id, selected.id)} title="Remove from board, keep file on disk" type="button">×</button>
              )}
            </div>

            {shot.expanded && (
              <div className="alternative-branch">
                {shot.media.map((media, altIndex) => (
                  <button className={media.id === selected?.id ? 'is-active' : ''} key={media.id} onClick={() => onShotChange(actId, scene.id, mode, shot.id, (draft) => { draft.selectedMediaId = media.id })} type="button">
                    <span>{altIndex + 1}</span>
                    {media.type === 'video' ? <video src={media.url} muted playsInline /> : media.type === 'audio' ? <div className="audio-alt">♪</div> : <img src={media.url} alt={media.fileName} />}
                  </button>
                ))}
              </div>
            )}

            <input
              className="shot-title-input"
              value={shot.title}
              onChange={(event) => onShotChange(actId, scene.id, mode, shot.id, (draft) => { draft.title = event.target.value })}
            />
            <textarea
              placeholder={mode === 'images' ? 'Image prompt / shot notes' : mode === 'videos' ? 'Video prompt / animation notes' : 'Music cue / SFX notes'}
              value={shot.prompt}
              onChange={(event) => onShotChange(actId, scene.id, mode, shot.id, (draft) => { draft.prompt = event.target.value })}
            />
            <div className="dialogue-row">
              <select value={shot.actor} onChange={(event) => onShotChange(actId, scene.id, mode, shot.id, (draft) => { draft.actor = event.target.value })}>
                <option value="">Narration / action</option>
                {actors.map((actor) => <option key={actor} value={actor}>{actor}</option>)}
              </select>
              <textarea
                placeholder="Dialogue or action text"
                value={shot.dialogue}
                onChange={(event) => onShotChange(actId, scene.id, mode, shot.id, (draft) => { draft.dialogue = event.target.value })}
              />
            </div>
            {dialoguePreview && <p className="dialogue-preview">{dialoguePreview}</p>}
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
  onPick,
  onTab,
  profiles,
}: {
  activeId: string
  activeTab: 'description' | 'traits' | 'video'
  category: CharacterCategory
  onPick: (id: string) => void
  onTab: (tab: 'description' | 'traits' | 'video') => void
  profiles: CharacterProfile[]
}) {
  const active = profiles.find((profile) => profile.id === activeId) || profiles[0]
  if (!active) return null

  return (
    <div className={`character-block ${category}`}>
      <div className="character-block-heading">
        <span>{categoryTitles[category]}</span>
        <strong>{profiles.length} playable dossiers</strong>
      </div>
      <div className="character-stage glass">
        <div className="character-portrait">
          <img src={active.image} alt={active.name} />
        </div>
        <div className="character-info">
          <p className="eyebrow">{categoryTitles[category]}</p>
          <h3>{active.name}</h3>
          <span>{active.role}</span>
          <div className="profile-tabs">
            <button className={activeTab === 'description' ? 'is-active' : ''} onClick={() => onTab('description')} type="button">Description</button>
            <button className={activeTab === 'traits' ? 'is-active' : ''} onClick={() => onTab('traits')} type="button">Traits</button>
            <button className={activeTab === 'video' ? 'is-active' : ''} onClick={() => onTab('video')} type="button">Video presentation</button>
          </div>
          <div className="profile-content">
            {activeTab === 'description' && (
              <>
                <p>{active.description}</p>
                <p>{active.backstory}</p>
              </>
            )}
            {activeTab === 'traits' && (
              <div className="trait-grid">
                {active.traits.map((trait) => <span key={trait}>{trait}</span>)}
              </div>
            )}
            {activeTab === 'video' && (
              <div className="video-placeholder">
                <strong>Self-presentation clip slot</strong>
                <p>When the character video is ready, it will replace this image inside the same panel.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="portrait-picker">
        {profiles.map((profile) => (
          <button className={active.id === profile.id ? 'is-active' : ''} key={profile.id} onClick={() => onPick(profile.id)} type="button">
            <img src={profile.image} alt={profile.name} />
            <span>{profile.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ScoreConsole({ activeTrack, onSelect, tracks }: { activeTrack: number; onSelect: (index: number) => void; tracks: Track[] }) {
  const track = tracks[activeTrack]
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [albumPage, setAlbumPage] = useState(0)
  const progress = duration ? current / duration : 0
  const albumPages = Math.ceil(tracks.length / 6)
  const visibleTracks = tracks.slice(albumPage * 6, albumPage * 6 + 6)

  useEffect(() => {
    setCurrent(0)
    setPlaying(false)
    audioRef.current?.load()
  }, [activeTrack])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAlbumPage((page) => (page + 1) % albumPages)
    }, 10000)
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
        </div>
        <div className="score-player">
          <p className="eyebrow">Now playing</p>
          <h3>{track.title}</h3>
          <p>{track.mood}</p>
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
