'use client';

import { HiXMark } from 'react-icons/hi2';
import { MdVolumeUp } from 'react-icons/md';
import { Modal, IconButton, Switch, Button } from '@/components/ui';
import {
  type ClockSettings,
  type ClockTheme,
  type ClockFontKey,
  CLOCK_THEMES,
  CLOCK_FONTS,
  getThemeColors,
  getFontFamily,
} from '@/lib/clockSettings';
import type { WorkChimeKind, WorkChimeSettings } from '@/lib/workChime';

interface ClockSettingsModalProps {
  show: boolean;
  settings: ClockSettings;
  workChimeSettings: WorkChimeSettings;
  isWorkChimeAudioEnabled: boolean;
  onUpdate: (patch: Partial<ClockSettings>) => void;
  onWorkChimeUpdate: (patch: Partial<WorkChimeSettings>) => void;
  onEnableWorkChimeAudio: () => void;
  onTestWorkChime: (kind: WorkChimeKind) => void;
  onReset: () => void;
  onClose: () => void;
}

const THEME_KEYS: ClockTheme[] = ['light', 'dark', 'coffee', 'green', 'lightblue'];
const FONT_KEYS: ClockFontKey[] = ['inter', 'robotoMono', 'oswald', 'orbitron', 'notoSansJP'];

export function ClockSettingsModal({
  show,
  settings,
  workChimeSettings,
  isWorkChimeAudioEnabled,
  onUpdate,
  onWorkChimeUpdate,
  onEnableWorkChimeAudio,
  onTestWorkChime,
  onReset,
  onClose,
}: ClockSettingsModalProps) {
  const themeColors = getThemeColors(settings.theme);

  const contentClassName = 'w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl border border-edge';

  return (
    <Modal show={show} onClose={onClose} contentClassName={contentClassName}>
      <div style={{ backgroundColor: themeColors.bg }}>
        {/* ヘッダー */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: themeColors.uiBg, backgroundColor: themeColors.bg }}
        >
          <h2 className="text-lg font-bold" style={{ color: themeColors.text }}>
            時計の設定
          </h2>
          <IconButton variant="ghost" rounded onClick={onClose} aria-label="閉じる">
            <HiXMark className="w-6 h-6" style={{ color: themeColors.uiText }} />
          </IconButton>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* ─── テーマ選択 ─── */}
          <section>
            <SectionLabel color={themeColors.uiText}>テーマ</SectionLabel>
            <div className="flex gap-3 mt-2">
              {THEME_KEYS.map((key) => {
                const theme = CLOCK_THEMES[key];
                const colors = theme.colors;
                const isSelected = settings.theme === key;
                return (
                  <IconButton
                    key={key}
                    onClick={() => onUpdate({ theme: key })}
                    variant="ghost"
                    size="sm"
                    className="flex flex-col items-center gap-1.5 min-w-[52px] !p-1 !min-h-0 !min-w-0 h-auto"
                    aria-label={`テーマ: ${theme.label}`}
                  >
                    <div
                      className="w-10 h-10 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: colors.bg,
                        borderColor: isSelected ? colors.accent : 'transparent',
                        boxShadow: isSelected ? `0 0 0 2px ${colors.accent}40` : 'none',
                      }}
                    >
                      <div
                        className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ color: colors.text }}
                      >
                        Aa
                      </div>
                    </div>
                    <span
                      className="text-xs font-medium"
                      style={{ color: isSelected ? themeColors.text : themeColors.uiText }}
                    >
                      {theme.label}
                    </span>
                  </IconButton>
                );
              })}
            </div>
          </section>

          {/* ─── フォント選択 ─── */}
          <section>
            <SectionLabel color={themeColors.uiText}>フォント</SectionLabel>
            <div className="mt-2 grid gap-2">
              {FONT_KEYS.map((key) => {
                const font = CLOCK_FONTS[key];
                const isSelected = settings.fontKey === key;
                return (
                  <Button
                    key={key}
                    onClick={() => onUpdate({ fontKey: key })}
                    variant="ghost"
                    size="sm"
                    className="flex items-center justify-between px-4 py-3 !rounded-xl text-left !min-h-0 w-full !font-normal"
                    style={{
                      backgroundColor: isSelected ? `${themeColors.accent}18` : themeColors.uiBg,
                      borderWidth: '1.5px',
                      borderStyle: 'solid',
                      borderColor: isSelected ? themeColors.accent : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="text-2xl font-bold leading-none"
                        style={{
                          fontFamily: getFontFamily(key),
                          color: themeColors.text,
                          fontFeatureSettings: '"tnum"',
                        }}
                      >
                        12:34
                      </span>
                      <div>
                        <span className="text-sm font-medium block" style={{ color: themeColors.text }}>
                          {font.label}
                        </span>
                        <span className="text-xs" style={{ color: themeColors.uiText }}>
                          {font.description}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                        style={{ backgroundColor: themeColors.accent }}
                      >
                        ✓
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>
          </section>

          {/* ─── 文字サイズ ─── */}
          <section>
            <div className="flex items-center justify-between">
              <SectionLabel color={themeColors.uiText}>文字サイズ</SectionLabel>
              <span className="text-sm font-mono" style={{ color: themeColors.uiText }}>
                {Math.round(settings.fontScale * 100)}%
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs" style={{ color: themeColors.uiText }}>
                小
              </span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={settings.fontScale}
                onChange={(e) => onUpdate({ fontScale: parseFloat(e.target.value) })}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${themeColors.accent} 0%, ${themeColors.accent} ${((settings.fontScale - 0.5) / 1.0) * 100}%, ${themeColors.uiBg} ${((settings.fontScale - 0.5) / 1.0) * 100}%, ${themeColors.uiBg} 100%)`,
                  accentColor: themeColors.accent,
                }}
                aria-label="文字サイズ"
              />
              <span className="text-xs" style={{ color: themeColors.uiText }}>
                大
              </span>
            </div>
          </section>

          {/* ─── 表示オプション ─── */}
          <section>
            <SectionLabel color={themeColors.uiText}>表示オプション</SectionLabel>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between py-3 px-1 min-h-[44px]">
                <span className="text-sm font-medium" style={{ color: themeColors.text }}>
                  24時間表示
                </span>
                <Switch checked={settings.use24Hour} onChange={(e) => onUpdate({ use24Hour: e.target.checked })} />
              </div>
              <div className="flex items-center justify-between py-3 px-1 min-h-[44px]">
                <span className="text-sm font-medium" style={{ color: themeColors.text }}>
                  秒を表示
                </span>
                <Switch checked={settings.showSeconds} onChange={(e) => onUpdate({ showSeconds: e.target.checked })} />
              </div>
              <div className="flex items-center justify-between py-3 px-1 min-h-[44px]">
                <span className="text-sm font-medium" style={{ color: themeColors.text }}>
                  日付を表示
                </span>
                <Switch checked={settings.showDate} onChange={(e) => onUpdate({ showDate: e.target.checked })} />
              </div>
            </div>
          </section>

          {/* ─── 作業チャイム ─── */}
          <section>
            <SectionLabel color={themeColors.uiText}>作業チャイム</SectionLabel>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between py-3 px-1 min-h-[44px]">
                <div>
                  <span className="text-sm font-medium block" style={{ color: themeColors.text }}>
                    作業チャイム
                  </span>
                  <span className="text-xs" style={{ color: themeColors.uiText }}>
                    休憩開始・作業開始を音と画面で知らせます
                  </span>
                </div>
                <Switch
                  checked={workChimeSettings.enabled}
                  onChange={(e) => onWorkChimeUpdate({ enabled: e.target.checked })}
                />
              </div>

              {workChimeSettings.enabled && (
                <>
                  <div className="flex items-center justify-between py-3 px-1 min-h-[44px]">
                    <span className="text-sm font-medium" style={{ color: themeColors.text }}>
                      音を鳴らす
                    </span>
                    <Switch
                      checked={workChimeSettings.soundEnabled}
                      onChange={(e) => {
                        onWorkChimeUpdate({ soundEnabled: e.target.checked });
                        if (e.target.checked) onEnableWorkChimeAudio();
                      }}
                    />
                  </div>

                  {workChimeSettings.soundEnabled && (
                    <div className="flex items-center justify-between py-3 px-1 min-h-[44px]">
                      <span className="text-sm font-medium" style={{ color: themeColors.text }}>
                        チャイム音
                      </span>
                      {isWorkChimeAudioEnabled ? (
                        <span className="text-sm font-medium" style={{ color: themeColors.accent }}>
                          有効
                        </span>
                      ) : (
                        <Button type="button" variant="secondary" size="sm" onClick={onEnableWorkChimeAudio}>
                          <MdVolumeUp className="mr-1.5 h-4 w-4" />
                          音を有効化
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="py-3 px-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-sm font-medium block" style={{ color: themeColors.text }}>
                          テスト再生
                        </span>
                        <span className="text-xs" style={{ color: themeColors.uiText }}>
                          画面表示と音を確認します
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onTestWorkChime('break')}
                        aria-label="休憩開始をテスト"
                        className="w-full !px-3"
                      >
                        休憩開始
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onTestWorkChime('work-start')}
                        aria-label="作業開始をテスト"
                        className="w-full !px-3"
                      >
                        作業開始
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onTestWorkChime('cleanup-start')}
                        aria-label="掃除開始をテスト"
                        className="w-full !px-3"
                      >
                        掃除開始
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 px-1 min-h-[44px]">
                    <div>
                      <span className="text-sm font-medium block" style={{ color: themeColors.text }}>
                        音声アナウンス（未実装）
                      </span>
                      <span className="text-xs" style={{ color: themeColors.uiText }}>
                        初期値はOFFです
                      </span>
                    </div>
                    <Switch
                      checked={workChimeSettings.voiceAnnouncementEnabled}
                      onChange={(e) => onWorkChimeUpdate({ voiceAnnouncementEnabled: e.target.checked })}
                    />
                  </div>

                  <div className="py-3 px-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: themeColors.text }}>
                        音量
                      </span>
                      <span className="text-sm font-mono" style={{ color: themeColors.uiText }}>
                        {Math.round(workChimeSettings.volume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={workChimeSettings.volume}
                      onChange={(e) => onWorkChimeUpdate({ volume: parseFloat(e.target.value) })}
                      className="mt-2 w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, ${themeColors.accent} 0%, ${themeColors.accent} ${workChimeSettings.volume * 100}%, ${themeColors.uiBg} ${workChimeSettings.volume * 100}%, ${themeColors.uiBg} 100%)`,
                        accentColor: themeColors.accent,
                      }}
                      aria-label="作業チャイムの音量"
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ─── リセットボタン ─── */}
          <div className="pt-2 pb-2">
            <Button variant="secondary" fullWidth onClick={onReset} size="md">
              設定をリセット
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── サブコンポーネント ───

function SectionLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color }}>
      {children}
    </h3>
  );
}
