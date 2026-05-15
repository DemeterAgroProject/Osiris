import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) => filename.split(/[\\/]/).includes('node_modules') ? undefined : true
    },
    // Adicione esta seção para configurar o inspetor
    vitePlugin: {
        inspector: {
            // Ativa o inspetor (pode ser apenas inspector: true também)
            toggleKeyCombo: 'control-shift', // Atalho para ativar: Ctrl + Shift (ou Cmd + Shift no Mac)
            holdMode: false,
            showToggleButton: 'always', // Mostra um botão na tela ('always', 'active' ou 'never')
            toggleButtonPos: 'bottom-right' // Posição do botão
        }
    },
    kit: {
        adapter: adapter()
    }
};

export default config;