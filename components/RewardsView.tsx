
import React, { useRef, useEffect } from 'react';
import type { RewardNote } from '../types';
import { PlusIcon, TrashIcon, GiftIcon } from './icons';

interface NoteCardProps {
    note: RewardNote;
    onUpdate: (id: string, content: string) => void;
    onDelete: (id: string) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onUpdate, onDelete }) => {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const textArea = textAreaRef.current;
        if (textArea) {
            textArea.style.height = 'auto';
            textArea.style.height = `${textArea.scrollHeight}px`;
        }
    }, [note.content]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdate(note.id, e.target.value);
    };

    return (
        <div className={`group relative flex flex-col p-4 rounded-lg shadow-sm border transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${note.color}`}>
            <textarea
                ref={textAreaRef}
                value={note.content}
                onChange={handleContentChange}
                placeholder="כתוב משהו..."
                className="flex-1 w-full bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none resize-none overflow-hidden text-base leading-relaxed"
                rows={1}
            />
            <button
                onClick={() => onDelete(note.id)}
                className="absolute top-2 right-2 p-1.5 text-gray-500 bg-black/5 dark:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 hover:text-red-600 dark:hover:text-red-400"
                aria-label="מחק פתקית"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    );
};


interface RewardsViewProps {
    notes: RewardNote[];
    onAddNote: () => void;
    onUpdateNote: (id: string, content: string) => void;
    onDeleteNote: (id:string) => void;
}

const RewardsView: React.FC<RewardsViewProps> = ({ notes, onAddNote, onUpdateNote, onDeleteNote }) => {
    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="max-w-screen-2xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">תגמולים ורעיונות</h2>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">מקום לרשום הערות, רעיונות ותובנות לגבי סדנאות ואירועים.</p>
                    </div>
                    <button 
                        onClick={onAddNote} 
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-sm"
                    >
                        <PlusIcon className="w-4 h-4"/> הוסף פתקית
                    </button>
                </div>

                {notes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {notes.map(note => (
                            <NoteCard 
                                key={note.id} 
                                note={note} 
                                onUpdate={onUpdateNote} 
                                onDelete={onDeleteNote} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 border-2 border-dashed border-slate-200 dark:border-gray-800 rounded-lg">
                        <GiftIcon className="mx-auto w-16 h-16 text-gray-300 dark:text-gray-600" />
                        <h3 className="mt-4 text-lg font-medium text-gray-800 dark:text-gray-200">אין עדיין פתקיות</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">לחץ על 'הוסף פתקית' כדי ליצור את הרעיון הראשון שלך.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RewardsView;
