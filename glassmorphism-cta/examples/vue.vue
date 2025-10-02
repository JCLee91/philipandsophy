<template>
    <component 
        :is="componentType"
        :href="href"
        :type="type"
        :class="buttonClasses"
        :style="style"
        :target="target"
        :rel="rel"
        @click="handleClick"
    >
        <span class="cta-text">{{ text }}</span>
        <div v-if="showArrow" class="cta-arrow">
            <slot name="icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path 
                        d="M9 18L15 12L9 6" 
                        stroke="currentColor" 
                        stroke-width="2" 
                        stroke-linecap="round" 
                        stroke-linejoin="round"
                    />
                </svg>
            </slot>
        </div>
    </component>
</template>

<script>
/**
 * 글래스모피즘 CTA 버튼 컴포넌트 - Vue 버전
 * 
 * Props:
 * - text (String, required): 버튼 텍스트
 * - href (String): 링크 URL (선택)
 * - compact (Boolean): 컴팩트 버전 사용
 * - fullWidth (Boolean): 전체 너비 사용
 * - showArrow (Boolean): 화살표 표시 여부 (기본: true)
 * - theme (String): 테마 ('dark' | 'light', 기본: 'dark')
 * - type (String): 버튼 타입 ('button' | 'submit' | 'reset')
 * - className (String): 추가 CSS 클래스
 * - style (Object): 인라인 스타일
 * - target (String): 링크 타겟
 * - rel (String): 링크 rel 속성
 * 
 * Events:
 * - click: 클릭 이벤트
 * 
 * Slots:
 * - icon: 커스텀 아이콘
 */
export default {
    name: 'GlassmorphismCTA',
    
    props: {
        text: {
            type: String,
            required: true
        },
        href: {
            type: String,
            default: '#'
        },
        compact: {
            type: Boolean,
            default: false
        },
        fullWidth: {
            type: Boolean,
            default: false
        },
        showArrow: {
            type: Boolean,
            default: true
        },
        theme: {
            type: String,
            default: 'dark',
            validator: (value) => ['dark', 'light'].includes(value)
        },
        type: {
            type: String,
            default: null,
            validator: (value) => !value || ['button', 'submit', 'reset'].includes(value)
        },
        className: {
            type: String,
            default: ''
        },
        style: {
            type: Object,
            default: () => ({})
        },
        target: {
            type: String,
            default: null
        },
        rel: {
            type: String,
            default: null
        }
    },

    computed: {
        componentType() {
            return this.type ? 'button' : 'a';
        },

        buttonClasses() {
            return [
                'cta-button',
                this.compact && 'compact',
                this.fullWidth && 'full-width',
                this.theme === 'light' && 'theme-light',
                this.className
            ].filter(Boolean).join(' ');
        }
    },

    methods: {
        handleClick(event) {
            this.$emit('click', event);
        }
    }
}
</script>

<style src="../cta-button.css"></style>

<!--
사용 예제:

<template>
    <div class="demo-container">
        <!-- 기본 버전 -->
        <GlassmorphismCTA 
            text="시작하기"
            href="https://example.com"
            @click="handleClick"
        />

        <!-- 컴팩트 버전 -->
        <GlassmorphismCTA 
            text="더 알아보기"
            href="https://example.com"
            compact
        />

        <!-- 풀 와이드 -->
        <GlassmorphismCTA 
            text="10월의 필립앤소피 참여하기"
            href="https://smore.im/form/13J1nUevrX"
            target="_blank"
            rel="noopener noreferrer"
            full-width
        />

        <!-- 화살표 없이 -->
        <GlassmorphismCTA 
            text="지금 참여하기"
            href="https://example.com"
            :show-arrow="false"
        />

        <!-- 버튼 타입 (폼 제출용) -->
        <GlassmorphismCTA 
            text="제출하기"
            type="submit"
            @click="handleSubmit"
        />

        <!-- 커스텀 아이콘 -->
        <GlassmorphismCTA 
            text="다운로드"
            href="#"
        >
            <template #icon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" 
                          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </template>
        </GlassmorphismCTA>

        <!-- 라이트 테마 -->
        <div style="background: #fff; padding: 20px;">
            <GlassmorphismCTA 
                text="라이트 테마"
                href="#"
                theme="light"
            />
        </div>
    </div>
</template>

<script>
import GlassmorphismCTA from './components/glassmorphism-cta/examples/vue.vue';

export default {
    components: {
        GlassmorphismCTA
    },
    
    methods: {
        handleClick(event) {
            event.preventDefault();
            console.log('CTA clicked!');
            // 여기에 분석 트래킹 추가
            // this.$gtag.event('click', { event_category: 'CTA' });
        },

        handleSubmit(event) {
            event.preventDefault();
            console.log('Form submitted!');
        }
    }
}
</script>

<style>
.demo-container {
    padding: 40px;
    background: #000;
    display: flex;
    flex-direction: column;
    gap: 20px;
    align-items: center;
}
</style>
-->

