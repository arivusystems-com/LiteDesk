<template>
  <div class="relative pb-28">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Your profile</h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        How you appear across the platform and the personal preferences that follow you everywhere
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <div class="flex flex-col items-center gap-3">
        <div class="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Loading your profile…</p>
      </div>
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3"
    >
      <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-semibold text-red-900 dark:text-red-200">Couldn't load your profile</h3>
        <p class="text-sm text-red-700 dark:text-red-300 mt-1">{{ error.message || 'Please try again.' }}</p>
        <button
          type="button"
          @click="fetchProfile"
          class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retry
        </button>
      </div>
    </div>

    <form v-else @submit.prevent="saveProfile" class="space-y-6">
      <!-- Identity Hero -->
      <section
        class="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        <div
          aria-hidden="true"
          class="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 dark:from-indigo-950/40 dark:via-gray-800 dark:to-fuchsia-950/40"
        ></div>
        <div
          aria-hidden="true"
          class="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-200/40 dark:bg-indigo-500/10 blur-3xl"
        ></div>
        <div
          aria-hidden="true"
          class="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-fuchsia-200/40 dark:bg-fuchsia-500/10 blur-3xl"
        ></div>

        <div class="relative p-6 sm:p-8">
          <div class="flex flex-col sm:flex-row sm:items-center gap-6">
            <!-- Avatar with edit/remove controls -->
            <div class="relative flex-shrink-0 group">
              <button
                type="button"
                @click="triggerAvatarPicker"
                @keydown.enter.prevent="triggerAvatarPicker"
                @keydown.space.prevent="triggerAvatarPicker"
                @dragenter.prevent="isAvatarDragging = true"
                @dragover.prevent="isAvatarDragging = true"
                @dragleave.prevent="isAvatarDragging = false"
                @drop.prevent="handleAvatarDrop"
                :title="form.avatar ? 'Change avatar' : 'Upload avatar'"
                :class="[
                  'relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 transition-transform',
                  isAvatarDragging ? 'scale-[1.03] ring-2 ring-indigo-400' : 'hover:scale-[1.02]'
                ]"
              >
                <img
                  v-if="form.avatar && !avatarBroken"
                  :src="resolvedAvatarUrl"
                  alt="Your avatar"
                  class="w-full h-full object-cover"
                  @error="avatarBroken = true"
                />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white text-3xl font-bold"
                >
                  {{ initials }}
                </div>
                <span
                  v-if="avatarUploading"
                  class="absolute inset-0 bg-black/50 flex items-center justify-center text-white"
                >
                  <svg class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
                <!-- Hover overlay -->
                <span
                  v-else
                  class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center"
                >
                  <span class="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium inline-flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Change
                  </span>
                </span>
              </button>
              <input
                ref="avatarInputRef"
                type="file"
                class="sr-only"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                @change="handleAvatarSelected"
              />
              <!-- Status dot -->
              <span
                class="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-gray-800"
                :class="statusDotClass"
                :aria-label="`Status: ${statusLabel}`"
              />
            </div>

            <!-- Identity Summary -->
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Your profile
              </p>
              <h3 class="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                {{ fullName || form.username || 'Add your name' }}
              </h3>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-300 truncate">
                {{ profile?.email || '—' }}
              </p>

              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-if="profile?.role"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 backdrop-blur capitalize"
                >
                  <svg class="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {{ profile.role }}
                  <span v-if="profile?.isOwner" class="ml-0.5 text-[10px] uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Owner</span>
                </span>
                <span
                  v-if="organizationName"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 backdrop-blur"
                >
                  <svg class="w-3.5 h-3.5 text-fuchsia-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {{ organizationName }}
                </span>
                <span
                  v-if="memberSinceLabel"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 backdrop-blur"
                >
                  <svg class="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Joined {{ memberSinceLabel }}
                </span>
              </div>

              <!-- Avatar actions -->
              <div class="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  @click="triggerAvatarPicker"
                  :disabled="avatarUploading"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {{ form.avatar ? 'Change photo' : 'Upload photo' }}
                </button>
                <button
                  v-if="form.avatar"
                  type="button"
                  @click="removeAvatar"
                  :disabled="avatarUploading"
                  class="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                  </svg>
                  Remove photo
                </button>
                <p v-if="avatarError" class="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ avatarError }}
                </p>
                <p v-else class="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, GIF, WEBP or SVG · up to 10MB · square works best
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Personal Information -->
      <section class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <header class="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-700/60">
          <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white shadow-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">Personal information</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Your name and contact details, visible to teammates</p>
          </div>
        </header>

        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label for="profile-first-name" class="block text-sm font-medium text-gray-900 dark:text-gray-200">First name</label>
            <input
              id="profile-first-name"
              v-model="form.firstName"
              type="text"
              maxlength="60"
              autocomplete="given-name"
              class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all outline-none"
              placeholder="e.g. Alex"
            />
          </div>

          <div class="space-y-2">
            <label for="profile-last-name" class="block text-sm font-medium text-gray-900 dark:text-gray-200">Last name</label>
            <input
              id="profile-last-name"
              v-model="form.lastName"
              type="text"
              maxlength="60"
              autocomplete="family-name"
              class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all outline-none"
              placeholder="e.g. Morgan"
            />
          </div>

          <div class="space-y-2">
            <label for="profile-phone" class="block text-sm font-medium text-gray-900 dark:text-gray-200">Phone number</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h2.586a1 1 0 01.707.293l2.121 2.121a1 1 0 01.293.707V8.5a1 1 0 01-.293.707L8.5 11a16 16 0 004.5 4.5l1.793-1.793A1 1 0 0115.5 13.5h2.379a1 1 0 01.707.293l2.121 2.121a1 1 0 01.293.707V19a2 2 0 01-2 2h-1C9.163 21 3 14.837 3 7V5z" />
                </svg>
              </span>
              <input
                id="profile-phone"
                v-model="form.phoneNumber"
                type="tel"
                autocomplete="tel"
                maxlength="40"
                class="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all outline-none"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Used for sign-in alerts and account recovery.</p>
          </div>

          <div class="space-y-2">
            <label for="profile-username" class="block text-sm font-medium text-gray-900 dark:text-gray-200">
              Username
              <span class="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">(read-only)</span>
            </label>
            <div class="relative">
              <input
                id="profile-username"
                :value="form.username"
                type="text"
                readonly
                class="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 cursor-not-allowed font-mono text-sm"
              />
              <button
                type="button"
                @click="copyToClipboard(form.username, 'Username')"
                class="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                :title="`Copy ${form.username}`"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="space-y-2 md:col-span-2">
            <label for="profile-email" class="block text-sm font-medium text-gray-900 dark:text-gray-200">
              Email address
              <span class="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">(managed by your admin)</span>
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 11-8 0 4 4 0 018 0zM3 5l9 7 9-7M3 5v14a2 2 0 002 2h14a2 2 0 002-2V5" />
                </svg>
              </span>
              <input
                id="profile-email"
                :value="profile?.email"
                type="email"
                readonly
                class="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Your sign-in email can only be changed by an organization admin to keep your account secure.
            </p>
          </div>
        </div>
      </section>

      <!-- Appearance & Preferences -->
      <section class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <header class="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-700/60">
          <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">Appearance</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Personal preferences applied just to your sessions</p>
          </div>
        </header>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-3">Theme</label>
            <div class="grid grid-cols-3 gap-3 max-w-xl">
              <button
                v-for="opt in themeOptions"
                :key="opt.id"
                type="button"
                @click="setTheme(opt.id)"
                :class="[
                  'group relative overflow-hidden rounded-xl border p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40',
                  colorMode === opt.id
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-500/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900/40'
                ]"
              >
                <!-- Preview swatch -->
                <div
                  class="h-16 rounded-lg overflow-hidden ring-1 ring-black/5 dark:ring-white/10 mb-3 flex"
                  :class="opt.swatchClass"
                >
                  <div class="w-1/3 h-full" :class="opt.previewLeft"></div>
                  <div class="flex-1 h-full p-1.5 flex flex-col gap-1">
                    <span class="block h-1.5 rounded-full" :class="opt.previewBar1"></span>
                    <span class="block h-1.5 w-1/2 rounded-full" :class="opt.previewBar2"></span>
                    <span class="block h-1.5 w-2/3 rounded-full mt-auto" :class="opt.previewBar3"></span>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ opt.label }}</span>
                  <span
                    v-if="colorMode === opt.id"
                    class="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300"
                  >Active</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ opt.description }}</p>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Security -->
      <section class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <header class="flex items-center justify-between gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-700/60">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">Sign-in &amp; security</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">Change your password and review recent activity</p>
            </div>
          </div>
          <button
            v-if="!showPasswordEditor"
            type="button"
            @click="openPasswordEditor"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0-1.105.895-2 2-2h.5a2.5 2.5 0 010 5H10v3m2-9V4m0 0L9 7m3-3l3 3" />
            </svg>
            Change password
          </button>
        </header>

        <div class="p-6">
          <div v-if="!showPasswordEditor" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-4">
              <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">Password</p>
              <p class="mt-1.5 text-sm font-medium text-gray-900 dark:text-white">••••••••••••</p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Use a long passphrase you don't reuse anywhere else.</p>
            </div>
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-4">
              <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">Last sign-in</p>
              <p class="mt-1.5 text-sm font-medium text-gray-900 dark:text-white">{{ lastLoginLabel || 'Just now' }}</p>
              <p v-if="lastLoginAbsolute" class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ lastLoginAbsolute }}</p>
            </div>
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-4">
              <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">Account status</p>
              <p class="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300 capitalize">
                <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                {{ profile?.status || 'active' }}
              </p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ profile?.userType ? profile.userType.toLowerCase() + ' user' : 'standard account' }}
              </p>
            </div>
          </div>

          <!-- Password Editor -->
          <div v-else class="space-y-4 max-w-xl">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-900 dark:text-gray-200">Current password</label>
              <div class="relative">
                <input
                  v-model="passwordForm.current"
                  :type="passwordVisibility.current ? 'text' : 'password'"
                  autocomplete="current-password"
                  class="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none"
                  placeholder="Enter your current password"
                />
                <button type="button" @click="passwordVisibility.current = !passwordVisibility.current" class="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <svg v-if="passwordVisibility.current" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-900 dark:text-gray-200">New password</label>
              <div class="relative">
                <input
                  v-model="passwordForm.next"
                  :type="passwordVisibility.next ? 'text' : 'password'"
                  autocomplete="new-password"
                  class="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none"
                  placeholder="At least 8 characters"
                />
                <button type="button" @click="passwordVisibility.next = !passwordVisibility.next" class="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <svg v-if="passwordVisibility.next" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>
              </div>

              <!-- Strength meter -->
              <div class="flex items-center gap-2 mt-1">
                <div class="h-1.5 flex-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    :class="passwordStrength.barClass"
                    :style="{ width: passwordStrength.percent + '%' }"
                  ></div>
                </div>
                <span class="text-xs font-medium" :class="passwordStrength.labelClass">{{ passwordStrength.label }}</span>
              </div>
              <ul class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <li v-for="rule in passwordRules" :key="rule.id" class="flex items-center gap-1.5">
                  <svg
                    class="w-3.5 h-3.5 flex-shrink-0"
                    :class="rule.met ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-600'"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path v-if="rule.met" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    <circle v-else cx="12" cy="12" r="4" stroke-width="2" />
                  </svg>
                  {{ rule.label }}
                </li>
              </ul>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-900 dark:text-gray-200">Confirm new password</label>
              <div class="relative">
                <input
                  v-model="passwordForm.confirm"
                  :type="passwordVisibility.confirm ? 'text' : 'password'"
                  autocomplete="new-password"
                  class="w-full px-3.5 py-2.5 pr-10 rounded-lg border bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-colors"
                  :class="passwordMismatch ? 'border-red-400 dark:border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400'"
                  placeholder="Re-enter your new password"
                />
                <button type="button" @click="passwordVisibility.confirm = !passwordVisibility.confirm" class="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <svg v-if="passwordVisibility.confirm" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>
              </div>
              <p v-if="passwordMismatch" class="text-xs text-red-600 dark:text-red-400">
                Passwords don't match yet.
              </p>
            </div>

            <p v-if="passwordError" class="text-sm text-red-600 dark:text-red-400">{{ passwordError }}</p>

            <div class="flex items-center gap-2 pt-1">
              <button
                type="button"
                @click="changePassword"
                :disabled="!canSubmitPassword || changingPassword"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg v-if="changingPassword" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ changingPassword ? 'Updating…' : 'Update password' }}
              </button>
              <button
                type="button"
                @click="cancelPasswordEditor"
                :disabled="changingPassword"
                class="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Workspace access -->
      <section class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <header class="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-700/60">
          <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">Workspace &amp; access</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Apps you can use and how your account is provisioned</p>
          </div>
        </header>

        <div class="p-6">
          <div v-if="appAccessList.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="entry in appAccessList"
              :key="entry.appKey"
              class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30"
            >
              <div
                class="flex items-center justify-center w-10 h-10 rounded-lg text-white shadow-sm"
                :class="entry.color"
              >
                <span class="text-sm font-bold">{{ entry.short }}</span>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ entry.label }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  <span v-if="entry.roleKey">{{ entry.roleKey.toLowerCase() }}</span>
                  <span v-else>Standard access</span>
                </p>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-10 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <p class="text-sm text-gray-500 dark:text-gray-400">You don't have access to any apps yet. Ask an admin to grant access.</p>
          </div>

          <!-- Account meta -->
          <dl class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">Organization</dt>
              <dd class="mt-1 text-gray-900 dark:text-white truncate">{{ organizationName || '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">Member since</dt>
              <dd class="mt-1 text-gray-900 dark:text-white">{{ memberSinceLabel || '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">Last login</dt>
              <dd class="mt-1 text-gray-900 dark:text-white">{{ lastLoginAbsolute || '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1.5">
                User ID
                <button
                  type="button"
                  @click="copyToClipboard(profile?._id, 'User ID')"
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  title="Copy user ID"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </dt>
              <dd class="mt-1 text-xs font-mono text-gray-700 dark:text-gray-200 break-all">{{ profile?._id || '—' }}</dd>
            </div>
          </dl>
        </div>
      </section>
    </form>

    <!-- Sticky Save Bar (for editable profile fields) -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-3"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-3"
    >
      <div
        v-if="!loading && !error && hasProfileChanges"
        class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(95vw,720px)]"
      >
        <div class="rounded-2xl bg-white dark:bg-gray-800 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-4">
          <div class="flex items-center gap-2 min-w-0">
            <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 flex-shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">You have unsaved changes</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">Save to update your profile across the platform.</p>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              @click="resetProfileForm"
              :disabled="saving"
              class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Discard
            </button>
            <button
              type="button"
              @click="saveProfile"
              :disabled="saving"
              class="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <svg v-if="saving" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ saving ? 'Saving…' : 'Save changes' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import apiClient from '@/utils/apiClient';
import { getApiUrlForFetch } from '@/config/apiBase';
import { useAuthStore } from '@/stores/authRegistry';
import { useColorMode } from '@/composables/useColorMode';
import { useNotifications } from '@/composables/useNotifications';

const authStore = useAuthStore();
const { colorMode, toggleColorMode } = useColorMode();
const { success: notifySuccess, error: notifyError } = useNotifications();

const ACCEPTED_AVATAR_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];
const MAX_AVATAR_SIZE = 10 * 1024 * 1024;

const loading = ref(true);
const saving = ref(false);
const error = ref(null);
const profile = ref(null);

const form = ref({
  firstName: '',
  lastName: '',
  phoneNumber: '',
  avatar: '',
  username: '',
});
const originalForm = ref({ ...form.value });

const avatarInputRef = ref(null);
const avatarUploading = ref(false);
const avatarBroken = ref(false);
const avatarError = ref('');
const isAvatarDragging = ref(false);

const showPasswordEditor = ref(false);
const changingPassword = ref(false);
const passwordError = ref('');
const passwordForm = reactive({ current: '', next: '', confirm: '' });
const passwordVisibility = reactive({ current: false, next: false, confirm: false });

const themeOptions = [
  {
    id: 'light',
    label: 'Light',
    description: 'Bright surfaces, classic look',
    swatchClass: 'bg-white',
    previewLeft: 'bg-gray-100',
    previewBar1: 'bg-indigo-500',
    previewBar2: 'bg-gray-300',
    previewBar3: 'bg-gray-300',
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes at night',
    swatchClass: 'bg-gray-900',
    previewLeft: 'bg-gray-800',
    previewBar1: 'bg-indigo-400',
    previewBar2: 'bg-gray-600',
    previewBar3: 'bg-gray-600',
  },
  {
    id: 'system',
    label: 'System',
    description: 'Match your device setting',
    swatchClass: 'bg-gradient-to-r from-white to-gray-900',
    previewLeft: 'bg-gradient-to-b from-gray-100 to-gray-800',
    previewBar1: 'bg-indigo-500',
    previewBar2: 'bg-gray-400',
    previewBar3: 'bg-gray-400',
  },
];

const fullName = computed(() => {
  const parts = [form.value.firstName, form.value.lastName].filter(Boolean).map((s) => s.trim());
  return parts.join(' ').trim();
});

const initials = computed(() => {
  const f = (form.value.firstName || '').trim();
  const l = (form.value.lastName || '').trim();
  if (f || l) return ((f[0] || '') + (l[0] || '')).toUpperCase() || 'U';
  const name = form.value.username || profile.value?.email || '';
  if (!name) return 'U';
  const seg = name.split(/[^a-z0-9]/i).filter(Boolean);
  if (seg.length >= 2) return (seg[0][0] + seg[1][0]).toUpperCase();
  return (seg[0]?.slice(0, 2) || 'U').toUpperCase();
});

const resolvedAvatarUrl = computed(() => {
  const url = form.value.avatar || '';
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return getApiUrlForFetch(url);
});

const organizationName = computed(() => {
  return authStore.organization?.name || profile.value?.organizationId?.name || '';
});

const statusLabel = computed(() => profile.value?.status === 'active' ? 'Active' : (profile.value?.status || 'Active'));
const statusDotClass = computed(() => {
  const s = profile.value?.status;
  if (s === 'suspended') return 'bg-rose-500';
  if (s === 'inactive') return 'bg-gray-400';
  return 'bg-emerald-500';
});

function formatRelative(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (Math.abs(minutes) < 1) return 'just now';
  if (Math.abs(minutes) < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.round(days / 7);
  if (Math.abs(weeks) < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function formatAbsolute(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const memberSinceLabel = computed(() => {
  const d = profile.value?.createdAt;
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
});

const lastLoginLabel = computed(() => formatRelative(profile.value?.lastLogin));
const lastLoginAbsolute = computed(() => formatAbsolute(profile.value?.lastLogin));

// Map appKey to colors and short labels for the access cards
const APP_PRESENTATION = {
  SALES: { label: 'Sales', short: 'S', color: 'bg-gradient-to-br from-indigo-500 to-violet-600' },
  HELPDESK: { label: 'Helpdesk', short: 'H', color: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
  PROJECTS: { label: 'Projects', short: 'P', color: 'bg-gradient-to-br from-amber-500 to-orange-600' },
  AUDIT: { label: 'Audit', short: 'A', color: 'bg-gradient-to-br from-sky-500 to-blue-600' },
  PORTAL: { label: 'Portal', short: 'Po', color: 'bg-gradient-to-br from-rose-500 to-pink-600' },
  LMS: { label: 'Learning', short: 'L', color: 'bg-gradient-to-br from-fuchsia-500 to-purple-600' },
};

const appAccessList = computed(() => {
  const direct = Array.isArray(profile.value?.appAccess) ? profile.value.appAccess : [];
  if (direct.length) {
    return direct
      .filter((a) => String(a?.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
      .map((a) => {
        const key = String(a.appKey || '').toUpperCase();
        const meta = APP_PRESENTATION[key] || { label: key || 'App', short: (key[0] || 'A').toUpperCase(), color: 'bg-gradient-to-br from-gray-500 to-gray-700' };
        return {
          appKey: key,
          roleKey: a.roleKey || '',
          label: meta.label,
          short: meta.short,
          color: meta.color,
        };
      });
  }
  const allowed = Array.isArray(profile.value?.allowedApps) ? profile.value.allowedApps : [];
  return allowed.map((k) => {
    const key = String(k).toUpperCase();
    const meta = APP_PRESENTATION[key] || { label: key, short: (key[0] || 'A').toUpperCase(), color: 'bg-gradient-to-br from-gray-500 to-gray-700' };
    return { appKey: key, roleKey: '', label: meta.label, short: meta.short, color: meta.color };
  });
});

// --- Password rules ---
const passwordRules = computed(() => {
  const p = passwordForm.next || '';
  return [
    { id: 'len', label: 'At least 8 characters', met: p.length >= 8 },
    { id: 'upper', label: 'An uppercase letter', met: /[A-Z]/.test(p) },
    { id: 'lower', label: 'A lowercase letter', met: /[a-z]/.test(p) },
    { id: 'num', label: 'A number', met: /\d/.test(p) },
    { id: 'sym', label: 'A symbol', met: /[^A-Za-z0-9]/.test(p) },
    { id: 'diff', label: 'Different from current', met: p.length > 0 && p !== passwordForm.current },
  ];
});

const passwordStrength = computed(() => {
  const met = passwordRules.value.filter((r) => r.met).length;
  const total = passwordRules.value.length;
  const percent = (met / total) * 100;
  if (met <= 1) return { percent, label: 'Very weak', barClass: 'bg-rose-500', labelClass: 'text-rose-600 dark:text-rose-400' };
  if (met <= 2) return { percent, label: 'Weak', barClass: 'bg-amber-500', labelClass: 'text-amber-600 dark:text-amber-400' };
  if (met <= 4) return { percent, label: 'Okay', barClass: 'bg-yellow-500', labelClass: 'text-yellow-600 dark:text-yellow-400' };
  if (met < total) return { percent, label: 'Strong', barClass: 'bg-emerald-500', labelClass: 'text-emerald-600 dark:text-emerald-400' };
  return { percent, label: 'Excellent', barClass: 'bg-emerald-500', labelClass: 'text-emerald-600 dark:text-emerald-400' };
});

const passwordMismatch = computed(() => Boolean(passwordForm.confirm) && passwordForm.confirm !== passwordForm.next);

const canSubmitPassword = computed(() => {
  if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) return false;
  if (passwordMismatch.value) return false;
  // Require at least the length rule + one of upper/lower/number/symbol.
  const met = passwordRules.value.filter((r) => r.met).length;
  return met >= 3 && passwordForm.next.length >= 8;
});

const hasProfileChanges = computed(() => {
  return (
    form.value.firstName !== originalForm.value.firstName ||
    form.value.lastName !== originalForm.value.lastName ||
    form.value.phoneNumber !== originalForm.value.phoneNumber
  );
});

// --- Fetch ---
async function fetchProfile() {
  loading.value = true;
  error.value = null;
  try {
    const result = await apiClient('/users/profile');
    if (!result?.success || !result?.data) {
      throw new Error(result?.message || 'Unable to load profile.');
    }
    profile.value = result.data;
    const snapshot = {
      firstName: result.data.firstName || '',
      lastName: result.data.lastName || '',
      phoneNumber: result.data.phoneNumber || '',
      avatar: result.data.avatar || '',
      username: result.data.username || '',
    };
    form.value = { ...snapshot };
    originalForm.value = { ...snapshot };
    avatarBroken.value = false;
  } catch (err) {
    console.error('Load profile failed', err);
    error.value = err;
  } finally {
    loading.value = false;
  }
}

// --- Save profile ---
async function saveProfile() {
  if (!hasProfileChanges.value) return;
  saving.value = true;
  try {
    const payload = {
      firstName: form.value.firstName?.trim() || '',
      lastName: form.value.lastName?.trim() || '',
      phoneNumber: form.value.phoneNumber?.trim() || '',
    };
    const result = await apiClient.put('/users/profile', payload);
    if (!result?.success) {
      throw new Error(result?.message || 'Failed to update profile');
    }
    originalForm.value = {
      ...originalForm.value,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phoneNumber: payload.phoneNumber,
    };
    await authStore.refreshUser({ force: true });
    notifySuccess('Profile updated');
  } catch (err) {
    console.error('Save profile failed', err);
    notifyError(err?.message || 'Failed to update profile');
  } finally {
    saving.value = false;
  }
}

function resetProfileForm() {
  form.value = { ...originalForm.value };
}

// --- Avatar upload ---
function triggerAvatarPicker() {
  if (avatarUploading.value) return;
  avatarInputRef.value?.click();
}

function handleAvatarSelected(e) {
  const file = e.target.files?.[0];
  if (file) uploadAvatar(file);
  if (avatarInputRef.value) avatarInputRef.value.value = '';
}

function handleAvatarDrop(e) {
  isAvatarDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) uploadAvatar(file);
}

async function uploadAvatar(file) {
  avatarError.value = '';
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    avatarError.value = 'Unsupported file type. Please use PNG, JPG, GIF, WEBP or SVG.';
    return;
  }
  if (file.size > MAX_AVATAR_SIZE) {
    avatarError.value = 'File too large. Maximum size is 10MB.';
    return;
  }

  avatarUploading.value = true;
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    const token = authStore.user?.token;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(getApiUrlForFetch('/users/profile/avatar'), {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      authStore.logout();
      throw new Error('Session expired. Please log in again.');
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || `Upload failed (${response.status})`);
    }
    const newUrl = result.data?.avatar;
    if (newUrl) {
      form.value.avatar = newUrl;
      originalForm.value.avatar = newUrl;
      avatarBroken.value = false;
      // Reflect new avatar in the global auth user immediately.
      if (authStore.user) {
        authStore.user = { ...authStore.user, avatar: newUrl };
        try {
          localStorage.setItem('user', JSON.stringify(authStore.user));
        } catch (_) {
          // localStorage may be unavailable in private modes — non-fatal.
        }
      }
      notifySuccess('Avatar updated');
    }
  } catch (err) {
    console.error('Avatar upload failed', err);
    avatarError.value = err?.message || 'Failed to upload avatar';
    notifyError(avatarError.value);
  } finally {
    avatarUploading.value = false;
  }
}

async function removeAvatar() {
  if (avatarUploading.value) return;
  avatarUploading.value = true;
  try {
    const result = await apiClient.delete('/users/profile/avatar');
    if (result?.success) {
      form.value.avatar = '';
      originalForm.value.avatar = '';
      if (authStore.user) {
        authStore.user = { ...authStore.user, avatar: '' };
        try {
          localStorage.setItem('user', JSON.stringify(authStore.user));
        } catch (_) {
          // localStorage may be unavailable; non-fatal.
        }
      }
      notifySuccess('Avatar removed');
    } else {
      throw new Error(result?.message || 'Failed to remove avatar');
    }
  } catch (err) {
    console.error('Remove avatar failed', err);
    notifyError(err?.message || 'Failed to remove avatar');
  } finally {
    avatarUploading.value = false;
  }
}

// --- Password change ---
function openPasswordEditor() {
  showPasswordEditor.value = true;
  passwordError.value = '';
  passwordForm.current = '';
  passwordForm.next = '';
  passwordForm.confirm = '';
}

function cancelPasswordEditor() {
  showPasswordEditor.value = false;
  passwordError.value = '';
  passwordForm.current = '';
  passwordForm.next = '';
  passwordForm.confirm = '';
  passwordVisibility.current = false;
  passwordVisibility.next = false;
  passwordVisibility.confirm = false;
}

async function changePassword() {
  if (!canSubmitPassword.value) return;
  passwordError.value = '';
  changingPassword.value = true;
  try {
    const result = await apiClient.put('/users/profile/password', {
      currentPassword: passwordForm.current,
      newPassword: passwordForm.next,
    });
    if (!result?.success) {
      throw new Error(result?.message || 'Failed to change password');
    }
    notifySuccess('Password updated');
    cancelPasswordEditor();
  } catch (err) {
    console.error('Change password failed', err);
    passwordError.value = err?.message || 'Failed to change password';
  } finally {
    changingPassword.value = false;
  }
}

// --- Theme ---
function setTheme(mode) {
  if (mode === colorMode.value) return;
  toggleColorMode(mode);
  notifySuccess(`Theme set to ${mode}`);
}

// --- Misc ---
async function copyToClipboard(value, label = 'Value') {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(String(value));
    notifySuccess(`${label} copied`);
  } catch (_e) {
    notifyError(`Couldn't copy ${label.toLowerCase()}`);
  }
}

onMounted(fetchProfile);
</script>
