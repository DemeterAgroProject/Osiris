<script>
    import Header from '$lib/components/Header.svelte';
    import BottomNav from '$lib/components/BottomNav.svelte';
    import { supabase } from '$lib/supabase';
    import { onMount } from 'svelte';


    
</script>

<div class="min-h-screen bg-gray-50 pb-20">
    <Header />

    <main class="px-4 py-4 max-w-3xl mx-auto w-full">

    </main>

    <BottomNav active="servicos" />
</div>