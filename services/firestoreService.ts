import { db } from './firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    CollectionReference,
    DocumentData,
    where
} from 'firebase/firestore';
import type { Gig, RecurringExpense, MonthlyExpenseInstance, Package, RewardNote } from '../types';

// Helper to get collection reference
const getCollection = (collectionName: string): CollectionReference<DocumentData, DocumentData> => {
    return collection(db, collectionName);
};

// Helper to strip undefined values
const cleanData = <T>(data: T): T => {
    return JSON.parse(JSON.stringify(data));
};

// --- Gigs ---
const GIGS_COLLECTION = 'gigs';

export const subscribeToGigs = (onUpdate: (gigs: Gig[]) => void) => {
    const q = query(getCollection(GIGS_COLLECTION), orderBy('eventDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const gigs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Gig[];
        onUpdate(gigs);
    });
};

export const addGig = async (gig: Omit<Gig, 'id'>) => {
    return addDoc(getCollection(GIGS_COLLECTION), cleanData(gig));
};

export const updateGig = async (id: string, gigData: Partial<Gig>) => {
    const docRef = doc(db, GIGS_COLLECTION, id);
    return updateDoc(docRef, cleanData(gigData) as DocumentData);
};

export const deleteGig = async (id: string) => {
    const docRef = doc(db, GIGS_COLLECTION, id);
    return deleteDoc(docRef);
};


// --- Expenses ---
const EXPENSES_COLLECTION = 'expenses';

export const subscribeToExpenses = (onUpdate: (expenses: RecurringExpense[]) => void) => {
    const q = query(getCollection(EXPENSES_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        const expenses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as RecurringExpense[];
        onUpdate(expenses);
    });
};

export const addExpense = async (expense: Omit<RecurringExpense, 'id'>) => {
    return addDoc(getCollection(EXPENSES_COLLECTION), cleanData(expense));
};

export const updateExpense = async (id: string, expenseData: Partial<RecurringExpense>) => {
    const docRef = doc(db, EXPENSES_COLLECTION, id);
    return updateDoc(docRef, cleanData(expenseData) as DocumentData);
};

export const deleteExpense = async (id: string) => {
    const docRef = doc(db, EXPENSES_COLLECTION, id);
    return deleteDoc(docRef);
};


// --- Monthly Instances ---
const INSTANCES_COLLECTION = 'monthly_instances';

export const subscribeToMonthlyInstances = (onUpdate: (instances: MonthlyExpenseInstance[]) => void) => {
    const q = query(getCollection(INSTANCES_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        // Ensure we capture the ID
        const instances = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
        })) as MonthlyExpenseInstance[];
        onUpdate(instances);
    });
};

export const saveMonthlyInstance = async (instance: MonthlyExpenseInstance) => {
    if (instance.id) {
        const docRef = doc(db, INSTANCES_COLLECTION, instance.id);
        const { id, ...data } = instance;
        return updateDoc(docRef, cleanData(data) as DocumentData);
    } else {
        return addDoc(getCollection(INSTANCES_COLLECTION), cleanData(instance));
    }
};

export const deleteMonthlyInstance = async (id: string) => {
    const docRef = doc(db, INSTANCES_COLLECTION, id);
    return deleteDoc(docRef);
};


// --- Packages ---
const PACKAGES_COLLECTION = 'packages';

export const subscribeToPackages = (onUpdate: (packages: Package[]) => void) => {
    const q = query(getCollection(PACKAGES_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        const pkgs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Package[];
        onUpdate(pkgs);
    });
};

export const addPackage = async (pkg: Omit<Package, 'id'>) => {
    return addDoc(getCollection(PACKAGES_COLLECTION), cleanData(pkg));
};

export const updatePackage = async (id: string, pkgData: Partial<Package>) => {
    const docRef = doc(db, PACKAGES_COLLECTION, id);
    return updateDoc(docRef, cleanData(pkgData) as DocumentData);
};

export const deletePackage = async (id: string) => {
    const docRef = doc(db, PACKAGES_COLLECTION, id);
    return deleteDoc(docRef);
};


// --- Rewards Notes ---
const NOTES_COLLECTION = 'rewards_notes';

export const subscribeToNotes = (onUpdate: (notes: RewardNote[]) => void) => {
    const q = query(getCollection(NOTES_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        const notes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as RewardNote[];
        onUpdate(notes);
    });
};

export const addNote = async (note: Omit<RewardNote, 'id'>) => {
    return addDoc(getCollection(NOTES_COLLECTION), cleanData(note));
};

export const updateNote = async (id: string, content: string) => {
    const docRef = doc(db, NOTES_COLLECTION, id);
    return updateDoc(docRef, { content });
};

export const deleteNote = async (id: string) => {
    const docRef = doc(db, NOTES_COLLECTION, id);
    return deleteDoc(docRef);
};
