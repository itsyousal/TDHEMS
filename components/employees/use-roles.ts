"use client";

import { useEffect, useState } from "react";

export type RoleOption = {
    id: string;
    name: string;
    slug: string;
};

export function useRoles(enabled: boolean) {
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [isLoading, setIsLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) {
            setRoles([]);
            setIsLoading(false);
            setError(null);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        window
            .fetch("/api/roles")
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to load roles");
                }
                return res.json();
            })
            .then((data: RoleOption[]) => {
                if (!cancelled) {
                    setRoles(data);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Failed to load roles");
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [enabled]);

    return { roles, isLoading, error };
}
