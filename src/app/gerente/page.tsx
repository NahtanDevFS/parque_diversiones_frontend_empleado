"use client";

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation';

export default function Gerente() {
    const router = useRouter();

    useEffect(() => {
        router.push('/gerente/ingresos-ventas');
    }, [router])

  return (
    <div></div>
  )
}
