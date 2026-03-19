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

  /** Add a new artifact (auto-generates artifactId if not provided). Returns the generated ID. */
  addArtifact: (artifact: Omit<CoreArtifact, 'artifactId' | 'stateHistory'> & { artifactId?: string }) => string;

  /** Update an existing artifact by ID */
  updateArtifact: (artifactId: string, updates: Partial<CoreArtifact>) => void;

  /** Remove an artifact by ID */
  removeArtifact: (artifactId: string) => void;

  /** Transition artifact state (validates forward-only). Returns true if transition was valid. */
  transitionState: (artifactId: string, to: ArtifactState, triggeredBy: string) => boolean;

  /** Batch transition: when a gate passes, transition all matching artifact types. Returns count. */
  applyGateTransition: (gateId: string) => number;

  /** Query helpers */
  getByType: (type: ArtifactType) => CoreArtifact[];
  getById: (artifactId: string) => CoreArtifact | undefined;
  getByState: (state: ArtifactState) => CoreArtifact[];
}

const ArtifactContext = createContext<ArtifactContextValue | null>(null);

export function ArtifactProvider({ children }: { children: ReactNode }) {
  const [artifacts, setArtifacts] = useState<CoreArtifact[]>([]);

  const addArtifact = useCallback((input: Omit<CoreArtifact, 'artifactId' | 'stateHistory'> & { artifactId?: string }): string => {
    const now = new Date().toISOString();
    // Compute ID synchronously before setState to avoid ref-based race condition
    // We read current artifacts via functional updater, but generate ID upfront
    // using a snapshot. The functional updater guarantees no duplicates.
    let resolvedId = input.artifactId || '';

    setArtifacts(prev => {
      const existingIds = prev.map(a => a.artifactId);
      if (!resolvedId) {
        resolvedId = generateArtifactId(input.artifactType, existingIds);
      }

      const newArtifact = {
        ...input,
        artifactId: resolvedId,
        stateHistory: [],
        createdAt: input.createdAt || now,
        updatedAt: now,
      } as CoreArtifact;

      return [...prev, newArtifact];
    });

    return resolvedId;
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

  const transitionState = useCallback((artifactId: string, to: ArtifactState, triggeredBy: string): boolean => {
    let success = false;
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
        success = true;
        return {
          ...a,
          artifactState: to,
          stateHistory: [...a.stateHistory, transition],
          updatedAt: new Date().toISOString(),
        } as CoreArtifact;
      })
    );
    return success;
  }, []);

  const applyGateTransition = useCallback((gateId: string): number => {
    const mapping = GATE_ARTIFACT_TRANSITIONS[gateId];
    if (!mapping) return 0;

    let count = 0;
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
        count++;
        return {
          ...a,
          artifactState: mapping.to,
          stateHistory: [...a.stateHistory, transition],
          updatedAt: now,
        } as CoreArtifact;
      })
    );
    return count;
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
