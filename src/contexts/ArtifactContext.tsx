import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
  CoreArtifact,
  ArtifactType,
  ArtifactState,
  ArtifactStateTransition,
} from '@/types/artifact';
import { isValidTransition, GATE_ARTIFACT_TRANSITIONS } from '@/types/artifact';
import { generateArtifactId } from '@/utils/artifactId';

interface ArtifactContextValue {
  artifacts: CoreArtifact[];

  /** Add a new artifact (auto-generates artifactId if not provided) */
  addArtifact: (artifact: Omit<CoreArtifact, 'artifactId' | 'stateHistory'> & { artifactId?: string }) => CoreArtifact;

  /** Update an existing artifact by ID */
  updateArtifact: (artifactId: string, updates: Partial<CoreArtifact>) => void;

  /** Remove an artifact by ID */
  removeArtifact: (artifactId: string) => void;

  /** Transition artifact state (validates forward-only) */
  transitionState: (artifactId: string, to: ArtifactState, triggeredBy: string) => boolean;

  /** Batch transition: when a gate passes, transition all matching artifact types */
  applyGateTransition: (gateId: string) => number;

  /** Query helpers */
  getByType: (type: ArtifactType) => CoreArtifact[];
  getById: (artifactId: string) => CoreArtifact | undefined;
  getByState: (state: ArtifactState) => CoreArtifact[];
}

const ArtifactContext = createContext<ArtifactContextValue | null>(null);

export function ArtifactProvider({ children }: { children: ReactNode }) {
  const [artifacts, setArtifacts] = useState<CoreArtifact[]>([]);

  const addArtifactRef = { current: null as CoreArtifact | null };
  const addArtifact = useCallback((input: Omit<CoreArtifact, 'artifactId' | 'stateHistory'> & { artifactId?: string }) => {
    const now = new Date().toISOString();

    setArtifacts(prev => {
      const existingIds = prev.map(a => a.artifactId);
      const artifactId = input.artifactId || generateArtifactId(input.artifactType, existingIds);

      const newArtifact = {
        ...input,
        artifactId,
        stateHistory: [],
        createdAt: input.createdAt || now,
        updatedAt: now,
      } as CoreArtifact;

      addArtifactRef.current = newArtifact;
      return [...prev, newArtifact];
    });
    return addArtifactRef.current!;
  }, []);

  const updateArtifact = useCallback((artifactId: string, updates: Partial<CoreArtifact>) => {
    setArtifacts(prev =>
      prev.map(a =>
        a.artifactId === artifactId
          ? { ...a, ...updates, updatedAt: new Date().toISOString() } as CoreArtifact
          : a
      )
    );
  }, []);

  const removeArtifact = useCallback((artifactId: string) => {
    setArtifacts(prev => prev.filter(a => a.artifactId !== artifactId));
  }, []);

  const transitionResultRef = { current: false };
  const transitionState = useCallback((artifactId: string, to: ArtifactState, triggeredBy: string): boolean => {
    transitionResultRef.current = false;
    setArtifacts(prev =>
      prev.map(a => {
        if (a.artifactId !== artifactId) return a;
        if (!isValidTransition(a.artifactState, to)) return a;

        const transition: ArtifactStateTransition = {
          from: a.artifactState,
          to,
          triggeredBy,
          timestamp: new Date().toISOString(),
        };
        transitionResultRef.current = true;
        return {
          ...a,
          artifactState: to,
          stateHistory: [...a.stateHistory, transition],
          updatedAt: new Date().toISOString(),
        } as CoreArtifact;
      })
    );
    return transitionResultRef.current;
  }, []);

  const gateCountRef = { current: 0 };
  const applyGateTransition = useCallback((gateId: string): number => {
    const mapping = GATE_ARTIFACT_TRANSITIONS[gateId];
    if (!mapping) return 0;

    gateCountRef.current = 0;
    const now = new Date().toISOString();

    setArtifacts(prev =>
      prev.map(a => {
        if (!mapping.types.includes(a.artifactType)) return a;
        if (!isValidTransition(a.artifactState, mapping.to)) return a;

        const transition: ArtifactStateTransition = {
          from: a.artifactState,
          to: mapping.to,
          triggeredBy: gateId,
          timestamp: now,
        };
        gateCountRef.current++;
        return {
          ...a,
          artifactState: mapping.to,
          stateHistory: [...a.stateHistory, transition],
          updatedAt: now,
        } as CoreArtifact;
      })
    );
    return gateCountRef.current;
  }, []);

  const getByType = useCallback((type: ArtifactType) => artifacts.filter(a => a.artifactType === type), [artifacts]);
  const getById = useCallback((artifactId: string) => artifacts.find(a => a.artifactId === artifactId), [artifacts]);
  const getByState = useCallback((state: ArtifactState) => artifacts.filter(a => a.artifactState === state), [artifacts]);

  return (
    <ArtifactContext.Provider
      value={{
        artifacts,
        addArtifact,
        updateArtifact,
        removeArtifact,
        transitionState,
        applyGateTransition,
        getByType,
        getById,
        getByState,
      }}
    >
      {children}
    </ArtifactContext.Provider>
  );
}

export function useArtifacts() {
  const ctx = useContext(ArtifactContext);
  if (!ctx) throw new Error('useArtifacts must be used within ArtifactProvider');
  return ctx;
}
