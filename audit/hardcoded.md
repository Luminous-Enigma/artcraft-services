# Colours written into the webapp's code

199 places in 36 files. "Themed text" already reads a theme variable (tailwind.config.js, MEANING_FAMILIES); the rest do not.

| Group                                      | Places | Examples                                                 |
|--------------------------------------------|--------|----------------------------------------------------------|
| literal colour                             | 19     | #4285F4 #34A853 #FBBC05 #EA4335                          |
| background or border tint                  | 109    | bg-red-500/10 border-red-500/20 bg-red-500/20 bg-red-500 |
| themed text                                | 66     | text-red-500 text-red-400 text-purple-300 text-amber-300 |
| text outside the themed families or shades | 5      | text-violet-400 text-amber-100                           |

## By file

| File                                                 | Hex | rgb()/hsl() | Palette classes | Examples                                                     |
|------------------------------------------------------|-----|-------------|-----------------|--------------------------------------------------------------|
| `pages/home/home.tsx`                                | 0   | 0           | 50              | border-blue-400/40 bg-blue-500/20 text-blue-300              |
| `components/topbar/task-queue.tsx`                   | 1   | 0           | 34              | text-green-400 bg-red-500/10 text-red-400                    |
| `pages/create-video/create-video.tsx`                | 0   | 0           | 9               | border-amber-500/40 text-amber-100 text-amber-400            |
| `pages/library/library.tsx`                          | 0   | 6           | 3               | text-violet-400 rgba(255,255,255,0.05) rgba(255,255,255,0.1) |
| `pages/forgot-password/verify-reset.tsx`             | 0   | 0           | 8               | bg-red-500/10 border-red-500/20 text-red-500                 |
| `pages/checkout/success.tsx`                         | 1   | 0           | 5               | bg-green-500/10 text-green-400 #431407                       |
| `pages/referrals/referrals.tsx`                      | 0   | 0           | 6               | bg-red-500/10 border-red-500/20 text-red-400                 |
| `pages/video-editor/components/VideoProjectCard.tsx` | 1   | 0           | 5               | bg-blue-600/20 bg-purple-600/20 #00AABA                      |
| `pages/forgot-password/forgot-password.tsx`          | 0   | 0           | 5               | bg-red-500/10 border-red-500/20 text-red-500                 |
| `pages/onboarding/onboarding.tsx`                    | 0   | 0           | 5               | bg-green-500/10 text-green-400 bg-red-500/10                 |
| `pages/welcome/welcome.tsx`                          | 1   | 0           | 4               | text-green-400 #431407 border-orange-900/50                  |
| `components/auth/GoogleLoginButton.tsx`              | 4   | 0           | 0               | #4285F4 #34A853 #FBBC05                                      |
| `components/lightbox/LightboxDetails.tsx`            | 0   | 0           | 4               | bg-red-500/10 bg-red-500/20 text-red-500                     |
| `components/sidebar/app-sidebar.tsx`                 | 0   | 0           | 4               | border-purple-400/40 text-purple-300 border-amber-400/40     |
| `components/topbar/TopBarActions.tsx`                | 1   | 0           | 3               | #0b0b0c bg-red-500/10 text-red-400                           |
| `components/auth/signup-form.tsx`                    | 0   | 0           | 3               | bg-red-500/10 border-red-500/20 text-red-500                 |
| `components/lightbox/lightbox.tsx`                   | 0   | 0           | 3               | bg-red-500/10 bg-red-500/20 text-red-500                     |
| `components/signup-cta-modal.tsx`                    | 0   | 0           | 3               | border-red-500/20 bg-red-500/10 text-red-500                 |
| `pages/login/login.tsx`                              | 0   | 0           | 3               | bg-red-500/10 border-red-500/20 text-red-500                 |
| `pages/pagescene/pagescene.tsx`                      | 0   | 0           | 3               | border-amber-400/30 bg-amber-500/25 text-amber-300           |
| `pages/pagescene/splash/example-scenes.ts`           | 0   | 0           | 3               | bg-orange-500/15 bg-teal-500/15 bg-amber-500/15              |
| `pages/set-password/set-password.tsx`                | 0   | 0           | 3               | bg-red-500/10 border-red-500/20 text-red-500                 |
| `components/prompt-box/CharactersModal.tsx`          | 0   | 0           | 2               | bg-red-500                                                   |
| `components/settings-modal/ApiKeySection.tsx`        | 0   | 0           | 2               | text-red-400                                                 |
| `components/toast/toast.tsx`                         | 0   | 0           | 2               | bg-green-500 bg-red-500                                      |
| `pages/support/support.tsx`                          | 2   | 0           | 0               | #5865F2                                                      |
| `components/prompt-box/MediaReferenceRow.tsx`        | 0   | 0           | 1               | text-red-400                                                 |
| `components/prompt-box/PromptBox.tsx`                | 0   | 0           | 1               | text-red-500                                                 |
| `components/prompt-box/PromptBoxDropZone.tsx`        | 0   | 0           | 1               | border-red-400/80                                            |
| `components/prompt-box/PromptFullscreen.tsx`         | 0   | 0           | 1               | text-red-500                                                 |
| `components/settings-modal/AccountSection.tsx`       | 0   | 0           | 1               | text-red-400                                                 |
| `components/sidebar/library-folders-nav.tsx`         | 0   | 0           | 1               | text-amber-400                                               |
| `components/sidebar/library-tags-nav.tsx`            | 0   | 0           | 1               | text-violet-400                                              |
| `pages/create-audio/create-audio.tsx`                | 0   | 0           | 1               | text-red-500                                                 |
| `pages/pagedraw/pagedraw.tsx`                        | 1   | 0           | 0               | #0b0b0c                                                      |
| `pages/video-editor/video-editor.tsx`                | 1   | 0           | 0               | #000000                                                      |
