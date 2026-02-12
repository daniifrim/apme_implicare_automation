export interface Submission {
  id: string;
  submissionTime: string;
  name: string;
  phone: string;
  email: string;
  age: number;
  location: "În România" | "În Diaspora";
  cityRomania?: string;
  cityCountry?: string;
  church: string;
  prayerPreference: string;
  missionary?: string;
  ethnicGroup?: string;
  prayerDuration: string;
  interests: {
    missionCamps: boolean;
    volunteer: boolean;
    donate: boolean;
    missionTrip: boolean;
    courses: boolean;
  };
  assignedTemplates: string[];
  status: "accepted" | "pending" | "error";
}

export const mockSubmissions: Submission[] = [
  {
    id: "fi7bawvefupusfi7bpjn909th5pa8d63",
    submissionTime: "2025-05-28T06:42:42",
    name: "Betina",
    phone: "+40774916853",
    email: "betinaioana20@gmail.com",
    age: 33,
    location: "În Diaspora",
    cityCountry: "Cj",
    church: "Logos",
    prayerPreference: "Misionar",
    missionary: "Nora (Orientul Mijlociu)",
    prayerDuration: "1 lună",
    interests: {
      missionCamps: true,
      volunteer: false,
      donate: false,
      missionTrip: false,
      courses: false,
    },
    assignedTemplates: ["Rugaciune Misionar"],
    status: "accepted",
  },
  {
    id: "4xavmw4q0atf38u4x1q1nf7xrdxzl3ki",
    submissionTime: "2025-05-23T10:39:28",
    name: "MARCU TANASE",
    phone: "+4917627545155",
    email: "tanasemarcutimotei@gmail.com",
    age: 19,
    location: "În Diaspora",
    cityCountry: "Germania, Trossingen 78647",
    church: "Filadelfia Trossingen",
    prayerPreference: "Popor neatins cu Evanghelia",
    ethnicGroup: "Fulani/Sokoto (Niger)",
    prayerDuration: "1 lună",
    interests: {
      missionCamps: true,
      volunteer: true,
      donate: false,
      missionTrip: true,
      courses: true,
    },
    assignedTemplates: ["Rugaciune Grup Etnic", "Info Voluntariat"],
    status: "accepted",
  },
  {
    id: "4xjv43rmvf565o44xj8r6f9tvra1wivh",
    submissionTime: "2025-05-23T10:29:31",
    name: "Prutean pavel",
    phone: "+37368337388",
    email: "prutean.pavel@mail.ru",
    age: 35,
    location: "În Diaspora",
    church: "",
    prayerPreference: "Popor neatins cu Evanghelia",
    ethnicGroup: "Aringa (Uganda)",
    prayerDuration: "1 lună",
    interests: {
      missionCamps: true,
      volunteer: true,
      donate: false,
      missionTrip: true,
      courses: false,
    },
    assignedTemplates: ["Rugaciune Grup Etnic"],
    status: "accepted",
  },
  {
    id: "dxteud8wvgafgbidxtevk74v4snptswz",
    submissionTime: "2025-05-23T10:29:10",
    name: "Filip-Ioan Tanase",
    phone: "+256790306964",
    email: "flpioan2@gmail.com",
    age: 20,
    location: "În Diaspora",
    cityCountry: "Trossingen 78647, Germania",
    church: "Biserica Penticostală Philadelphia Trossingen",
    prayerPreference: "Misionar",
    missionary: "Florin & Daniela (Uganda)",
    prayerDuration: "1 an",
    interests: {
      missionCamps: true,
      volunteer: false,
      donate: true,
      missionTrip: true,
      courses: true,
    },
    assignedTemplates: ["Rugaciune Misionar", "Info Cursuri"],
    status: "accepted",
  },
  {
    id: "kaa6w5sunc7rfmkr5kaa6gl3pb4hcy0n",
    submissionTime: "2025-05-23T10:28:54",
    name: "Dorobantu Stefania-Vali",
    phone: "+436763949382",
    email: "stefdoro08@yahoo.com",
    age: 41,
    location: "În Diaspora",
    cityCountry: "Wels, Austria",
    church: "Bethel Traun, Austria",
    prayerPreference: "Misionar",
    missionary: "Florin & Daniela (Uganda)",
    prayerDuration: "1 an",
    interests: {
      missionCamps: true,
      volunteer: true,
      donate: true,
      missionTrip: true,
      courses: true,
    },
    assignedTemplates: ["Rugaciune Misionar", "Info Voluntariat"],
    status: "pending",
  },
  {
    id: "pg6yll4a0pxzpg6ynz99uyqh78tubhyi",
    submissionTime: "2025-05-23T10:28:32",
    name: "Robert Simion",
    phone: "+34611610142",
    email: "robertsimion2299@gmail.com",
    age: 21,
    location: "În Diaspora",
    cityCountry: "Spain, Valencia",
    church: "Betel Valencia",
    prayerPreference: "Misionar",
    missionary: "Tabita H (Uganda)",
    prayerDuration: "1 an",
    interests: {
      missionCamps: true,
      volunteer: true,
      donate: false,
      missionTrip: true,
      courses: false,
    },
    assignedTemplates: ["Rugaciune Misionar"],
    status: "accepted",
  },
  {
    id: "9ckac55sjtwez1lg0mo79ckac55yssfq",
    submissionTime: "2025-05-23T10:28:31",
    name: "Bîrle Ovidiu",
    phone: "+40752622096",
    email: "v_deby30@yahoo.com",
    age: 42,
    location: "În România",
    cityRomania: "Baia Mare",
    church: "Maranata",
    prayerPreference: "Misionar",
    missionary: "Florin & Daniela (Uganda)",
    prayerDuration: "1 an",
    interests: {
      missionCamps: false,
      volunteer: false,
      donate: false,
      missionTrip: false,
      courses: false,
    },
    assignedTemplates: ["Rugaciune Misionar"],
    status: "error",
  },
  {
    id: "p24wcj3dcuanpm8713jdp24wcbdcnhyg",
    submissionTime: "2025-05-23T10:28:30",
    name: "Tothăzan Helga-Flavia",
    phone: "+40743111968",
    email: "helga_flavia@yahoo.com",
    age: 38,
    location: "În România",
    cityRomania: "Cluj-Napoca",
    church: "Biserica Penticostala nr. 1, Carpati",
    prayerPreference: "Misionar",
    missionary: "Tabita H (Uganda)",
    prayerDuration: "1 an",
    interests: {
      missionCamps: false,
      volunteer: false,
      donate: true,
      missionTrip: false,
      courses: true,
    },
    assignedTemplates: ["Rugaciune Misionar"],
    status: "accepted",
  },
];
