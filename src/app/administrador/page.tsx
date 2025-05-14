"use client";

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation';

export default function Administrador() {
    const router = useRouter();

    useEffect(() => {
        router.push('/administrador/agregar-atraccion');
    }, [router])

  return (
    <div></div>
  )
}