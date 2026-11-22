import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase/client";
import type {
  Company,
  DailyLog,
  DocFile,
  MaterialItem,
  Member,
  OptionCatalog,
  Role,
  Site,
  Task,
} from "@/lib/site/model";

export interface CloudSnapshot {
  companies: Company[];
  sites: Site[];
  logs: DailyLog[];
  tasks: Task[];
  materials: MaterialItem[];
  files: DocFile[];
  people: Member[];
  catalog: OptionCatalog | null;
}

export async function loadCloudData(
  role: Role,
  companyId: string | null,
  uid: string,
): Promise<CloudSnapshot> {
  const db = getFirebaseDb();
  if (!db) {
    return { companies: [], sites: [], logs: [], tasks: [], materials: [], files: [], people: [], catalog: null };
  }

  let catalog: OptionCatalog | null = null;
  try {
    const catSnap = await getDoc(doc(db, "platformConfig", "commonOptions"));
    if (catSnap.exists()) {
      const d = catSnap.data() as { workItems?: string[]; processes?: string[]; trades?: string[] };
      catalog = {
        processes: Array.isArray(d.processes) ? d.processes : Array.isArray(d.workItems) ? d.workItems : [],
        trades: Array.isArray(d.trades) ? d.trades : [],
      };
    }
  } catch {
    // optional
  }

  if (role === "platform_admin") {
    const compsSnap = await getDocs(collection(db, "companies"));
    const companies = compsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Company, "id">) }));
    return { companies, sites: [], logs: [], tasks: [], materials: [], files: [], people: [], catalog };
  }

  if (!companyId) {
    return { companies: [], sites: [], logs: [], tasks: [], materials: [], files: [], people: [], catalog };
  }

  const companies: Company[] = [];
  const compSnap = await getDoc(doc(db, "companies", companyId));
  if (compSnap.exists()) {
    companies.push({ id: compSnap.id, ...(compSnap.data() as Omit<Company, "id">) });
  }

  // Query sites respecting Firestore Security Rules (rules are not filters)
  const sitesCol = collection(db, "companies", companyId, "sites");
  const sitesQuery =
    role === "site_supervisor"
      ? query(sitesCol, where("supervisorId", "==", uid))
      : role === "subcontractor"
        ? query(sitesCol, where("assignedSubIds", "array-contains", uid))
        : sitesCol;
  const sitesSnap = await getDocs(sitesQuery);
  const sites = sitesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Site, "id">) }));

  const people: Member[] = [];
  if (role !== "subcontractor") {
    try {
      const pplSnap = await getDocs(collection(db, "companies", companyId, "people"));
      for (const d of pplSnap.docs) {
        people.push({ id: d.id, ...(d.data() as Omit<Member, "id">) });
      }
    } catch {
      // restricted
    }
  }

  const logs: DailyLog[] = [];
  const tasks: Task[] = [];
  const materials: MaterialItem[] = [];
  const files: DocFile[] = [];

  for (const site of sites) {
    if (role !== "subcontractor") {
      try {
        const logsSnap = await getDocs(collection(db, "companies", companyId, "sites", site.id, "logs"));
        for (const d of logsSnap.docs) logs.push({ id: d.id, ...(d.data() as Omit<DailyLog, "id">) });
      } catch {
        // ignore denied
      }
    }

    try {
      const tasksCol = collection(db, "companies", companyId, "sites", site.id, "tasks");
      const tasksQuery = role === "subcontractor" ? query(tasksCol, where("assigneeId", "==", uid)) : tasksCol;
      const tasksSnap = await getDocs(tasksQuery);
      for (const d of tasksSnap.docs) tasks.push({ id: d.id, ...(d.data() as Omit<Task, "id">) });
    } catch {
      // ignore denied
    }

    try {
      const matsCol = collection(db, "companies", companyId, "sites", site.id, "materials");
      const matsSnap = await getDocs(matsCol);
      for (const d of matsSnap.docs) materials.push({ id: d.id, ...(d.data() as Omit<MaterialItem, "id">) });
    } catch {
      // ignore denied
    }

    try {
      const filesCol = collection(db, "companies", companyId, "sites", site.id, "files");
      const filesSnap = await getDocs(filesCol);
      for (const d of filesSnap.docs) files.push({ id: d.id, ...(d.data() as Omit<DocFile, "id">) });
    } catch {
      // ignore denied
    }
  }

  return { companies, sites, logs, tasks, materials, files, people, catalog };
}

export async function pushSiteToCloud(site: Site): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  await setDoc(doc(db, "companies", site.companyId, "sites", site.id), site, { merge: true });
}

export async function pushLogToCloud(log: DailyLog): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  await setDoc(doc(db, "companies", log.companyId, "sites", log.siteId, "logs", log.id), log, { merge: true });
  await setDoc(
    doc(db, "companies", log.companyId, "sites", log.siteId, "dayStatus", log.date),
    { date: log.date, status: log.status, noWork: log.noWork, updatedAt: log.updatedAt },
    { merge: true },
  );
}

export async function pushTaskToCloud(task: Task): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  await setDoc(doc(db, "companies", task.companyId, "sites", task.siteId, "tasks", task.id), task, { merge: true });
}

export async function pushMaterialToCloud(item: MaterialItem): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  await setDoc(doc(db, "companies", item.companyId, "sites", item.siteId, "materials", item.id), item, { merge: true });
}

export async function pushFileToCloud(file: DocFile): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  await setDoc(doc(db, "companies", file.companyId, "sites", file.siteId, "files", file.id), file, { merge: true });
}

export async function pushCatalogToCloud(catalog: OptionCatalog): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  await setDoc(
    doc(db, "platformConfig", "commonOptions"),
    { processes: catalog.processes, workItems: catalog.processes, trades: catalog.trades },
    { merge: true },
  );
}

export async function uploadPhotoToCloud(
  companyId: string,
  siteId: string,
  category: "photos" | "tasks" | "logs" | "drawings",
  file: File,
  fileId: string,
): Promise<string | null> {
  const storage = getFirebaseStorage();
  if (!storage) return null;
  const path = `companies/${companyId}/sites/${siteId}/${category}/${fileId}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
  return getDownloadURL(storageRef);
}
