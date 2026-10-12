<script lang="ts">
	/**
	 * The grounds of both themes drawn in 3D, each region lifted one level off its base, the same in
	 * both, with a field set into it back down at the base: a level, not how far apart the grays
	 * are, which the step's card shows. It rests seen from straight
	 * above, the flat plan the server draws, where the two look alike. In sight a while, it tours
	 * the menu's views one after another, and the relief shows; the pointer coming onto it stops the
	 * tour where it is and leaves it to the reader, a drag turning it anywhere and the menu bringing
	 * it to a set view; and nearly scrolled out of sight it goes back to rest, to tour again. Every color is the token's own, worked out from the style's files: a top is
	 * unlit, and a side is the same gray at a share of its light.
	 */
	import * as stylex from '@stylexjs/stylex';
	import { borderWidth, radius } from '@canmi/design/scale.stylex';
	import Icon from '@canmi/design/components/icon.svelte';
	import ThemeScope from '@canmi/design/components/theme-scope.svelte';
	import type { Theme } from '@canmi/design/theme';
	import type { IconComponent } from '@canmi/design/components/icon';
	import Tooltip from '@canmi/design/components/tooltip.svelte';
	import CheckIcon from '@tabler/icons-svelte-runes/icons/check';
	import PerspectiveIcon from '@tabler/icons-svelte-runes/icons/perspective';
	import SquareIcon from '@tabler/icons-svelte-runes/icons/square';
	import StairsIcon from '@tabler/icons-svelte-runes/icons/stairs';
	import type * as Three from 'three';
	import { levelOf, lightnessOf, shadeOf } from './lightness.ts';
	import { Ticks } from './ticks.svelte.ts';

	/** The scene in its own units: a plate per theme, side by side, with room around them. */
	const SCENE = { width: 28, height: 13 };
	const PLATE = { width: 10, depth: 7, radius: 0.45, thickness: 0.3 };
	const REGION = { width: 7.6, depth: 5.2, radius: 0.35 };
	const FIELD = { width: 2.8, depth: 2.4, radius: 0.25 };
	/** How high a region stands over its base, one level in either theme. */
	const LEVEL = 0.8;
	/** The share of light a side takes, against a top's whole. */
	const SIDE = 0.8;

	/**
	 * A view, in degrees, as a camera going round it would take it: tipped from straight down
	 * toward the front, and turned about the upright. The camera stays above and the scene turns
	 * instead, so a drag can turn it about any line, as a hand turns what it holds.
	 */
	type Pose = { pitch: number; yaw: number };
	/**
	 * The menu's views, each a mark named by its tip, in the order the tour takes them, the first
	 * where it rests. A plane is one mark, seen flat from the top, and at a slant its near edge the
	 * long one, turned to face where the view comes from.
	 */
	const VIEWS = [
		{ name: 'Top', icon: SquareIcon, pose: { pitch: 0, yaw: 0 } },
		{ name: 'From the left', icon: PerspectiveIcon, pose: { pitch: 50, yaw: -20 } },
		{
			name: 'From the right',
			icon: PerspectiveIcon,
			turn: 'scaleX(-1)',
			pose: { pitch: 50, yaw: 20 },
		},
		{ name: 'Front', icon: PerspectiveIcon, turn: 'rotate(-90deg)', pose: { pitch: 55, yaw: 0 } },
		{ name: 'Side', icon: StairsIcon, pose: { pitch: 90, yaw: 0 } },
	] as const satisfies readonly { name: string; icon: IconComponent; turn?: string; pose: Pose }[];
	const REST = VIEWS[0].pose;
	/**
	 * In milliseconds: how long it rests in sight before the tour, a glide from view to view, and
	 * each view held. The camera's field is in degrees.
	 */
	const WAIT = 3000;
	const GLIDE = 1200;
	const HOLD = 1800;
	const FIELD_OF_VIEW = 15;
	/** How far a drag turns the scene, in degrees a pixel. */
	const TURN = 0.4;
	/** The shares of the box in sight above which its wait starts, and below which it goes back. */
	const ARRIVED = 0.6;
	const LEAVING = 0.2;

	const SLABS = [
		{ theme: 'light', x: -6 },
		{ theme: 'dark', x: 6 },
	] as const satisfies readonly { theme: Theme; x: number }[];

	/** A length or a place in the scene as a share of the box's width, for the flat plan. */
	const across = (units: number) => `calc(100cqw * ${units / SCENE.width})`;
	/** A rectangle centered at `x`, `z` in the scene, placed on the flat plan. */
	function placed(x: number, z: number, { width, depth }: { width: number; depth: number }) {
		return {
			left: `${((x - width / 2 + SCENE.width / 2) / SCENE.width) * 100}%`,
			top: `${((z - depth / 2 + SCENE.height / 2) / SCENE.height) * 100}%`,
			width: `${(width / SCENE.width) * 100}%`,
			height: `${(depth / SCENE.height) * 100}%`,
		};
	}

	let host: HTMLDivElement | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();
	/** Drawn at least once, so the canvas stands in for the plan. */
	let drawn = $state(false);
	let grabbing = $state(false);
	/**
	 * Moving, on its tour or in the reader's hands: the menu stays from then on, wherever the view
	 * is, until it goes back to rest on leaving sight.
	 */
	let engaged = $state(false);
	/** The menu's view the scene stands at, if any. */
	let at = $state<string>(VIEWS[0].name);
	/** Glides the view to a pose, once the scene is built. */
	let go: ((pose: Pose) => void) | undefined = $state();

	const ticks = new Ticks();
	/** Where the last press landed, and on which ground, for its tick. */
	let pressed = $state<{ x: number; y: number; key: string; theme: Theme }>();

	$effect(() => {
		if (!host || !canvas) return;
		const box = host;
		const surface = canvas;
		let stop: (() => void) | undefined;
		let gone = false;
		const near = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				near.disconnect();
				void import('three').then((three) => {
					if (!gone) stop = stage(three, box, surface);
				});
			},
			{ rootMargin: '50% 0px' },
		);
		near.observe(box);
		return () => {
			gone = true;
			near.disconnect();
			stop?.();
		};
	});

	/** Build the scene in `canvas` and keep it drawn; what it returns takes it all down again. */
	function stage(three: typeof Three, box: HTMLDivElement, view: HTMLCanvasElement) {
		const renderer = new three.WebGLRenderer({ canvas: view, antialias: true, alpha: true });
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		const scene = new three.Scene();
		/** Everything drawn, turned as one about the middle between the plates. */
		const held = new three.Group();
		scene.add(held);
		const camera = new three.PerspectiveCamera(FIELD_OF_VIEW, SCENE.width / SCENE.height, 1, 400);
		const owned: { dispose(): void }[] = [renderer];

		const gray = (l: number) => {
			const level = levelOf(l);
			return new three.Color().setRGB(level, level, level, three.SRGBColorSpace);
		};
		const flat = (l: number) => {
			const material = new three.MeshBasicMaterial({ color: gray(l) });
			owned.push(material);
			return material;
		};
		function rounded({
			width,
			depth,
			radius: round,
		}: {
			width: number;
			depth: number;
			radius: number;
		}) {
			const [x, y] = [width / 2, depth / 2];
			const path = new three.Shape();
			path.moveTo(-x + round, -y);
			path.lineTo(x - round, -y);
			path.quadraticCurveTo(x, -y, x, -y + round);
			path.lineTo(x, y - round);
			path.quadraticCurveTo(x, y, x - round, y);
			path.lineTo(-x + round, y);
			path.quadraticCurveTo(-x, y, -x, y - round);
			path.lineTo(-x, -y + round);
			path.quadraticCurveTo(-x, -y, -x + round, -y);
			return path;
		}
		/** A shape stood up `height` from the floor, its top one gray and its sides that gray shaded. */
		function solid(shape: Three.Shape, height: number, l: number, edge: number, token: string) {
			const geometry = new three.ExtrudeGeometry(shape, {
				depth: height,
				bevelEnabled: false,
				curveSegments: 12,
			});
			geometry.rotateX(-Math.PI / 2);
			const mesh = new three.Mesh(geometry, [flat(l), flat(shadeOf(l, SIDE))]);
			mesh.userData.token = token;
			const lines = new three.LineSegments(
				new three.EdgesGeometry(geometry, 30),
				new three.LineBasicMaterial({ color: gray(edge) }),
			);
			owned.push(geometry, lines.geometry, lines.material as Three.Material);
			mesh.add(lines);
			return mesh;
		}

		const pickable: Three.Mesh[] = [];
		for (const { theme, x } of SLABS) {
			const base = lightnessOf('--background-base', theme);
			const edge = lightnessOf('--border-default', theme);
			const plate = solid(rounded(PLATE), PLATE.thickness, base, edge, '--background-base');
			plate.position.set(x, -PLATE.thickness, 0);
			const shape = rounded(REGION);
			shape.holes.push(rounded(FIELD));
			const region = solid(
				shape,
				LEVEL,
				lightnessOf('--background-surface', theme),
				edge,
				'--background-surface',
			);
			region.position.set(x, 0, 0);
			plate.userData.theme = region.userData.theme = theme;
			held.add(plate, region);
			pickable.push(plate, region);
		}

		const still = matchMedia('(prefers-reduced-motion: reduce)');
		/** The turn of the scene that shows a pose: the camera's way round it, undone. */
		const turnOf = ({ pitch, yaw }: Pose) =>
			new three.Quaternion().setFromEuler(
				new three.Euler((-pitch * Math.PI) / 180, (-yaw * Math.PI) / 180, 0, 'XYZ'),
			);
		const turns = VIEWS.map((each) => turnOf(each.pose));
		const turn = turnOf(REST);
		let glide: { from: Three.Quaternion; to: Three.Quaternion; start: number } | undefined;
		let drag: { x: number; y: number; moved: boolean } | undefined;
		/**
		 * At rest and waiting to be seen, waiting in sight, on its tour, or the reader's: only leaving
		 * sight brings it back to the first.
		 */
		let phase: 'rest' | 'waiting' | 'touring' | 'free' = 'rest';
		let timer: ReturnType<typeof setTimeout> | undefined;
		let stop = 0;
		/** The tour's next view, glided to after the last is held. */
		function onward() {
			stop = (stop + 1) % VIEWS.length;
			go?.(VIEWS[stop]?.pose ?? REST);
		}

		/** Straight above, its top toward the scene's far side: the screen's right is x, its up -z. */
		camera.up.set(0, 0, -1);
		function look() {
			const reach = SCENE.width / 2 / (Math.tan((FIELD_OF_VIEW * Math.PI) / 360) * camera.aspect);
			camera.position.set(0, reach, 0);
			camera.lookAt(0, 0, 0);
			held.quaternion.copy(turn);
			renderer.render(scene, camera);
			drawn = true;
			const index = turns.findIndex((each) => turn.angleTo(each) < (0.5 * Math.PI) / 180);
			at = VIEWS[index]?.name ?? '';
		}

		let frame = 0;
		function tick(now: number) {
			frame = 0;
			if (glide) {
				const t = still.matches ? 1 : Math.min(1, (now - glide.start) / GLIDE);
				const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
				turn.slerpQuaternions(glide.from, glide.to, e);
				if (t === 1) {
					glide = undefined;
					if (phase === 'touring') timer = setTimeout(onward, HOLD);
				}
			}
			look();
			if (glide) frame = requestAnimationFrame(tick);
		}
		const kick = () => {
			if (!frame) frame = requestAnimationFrame(tick);
		};
		go = (to: Pose) => {
			drag = undefined;
			glide = { from: turn.clone(), to: turnOf(to), start: performance.now() };
			kick();
		};

		function fit() {
			const { width, height } = view.getBoundingClientRect();
			renderer.setSize(width, height, false);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			kick();
		}
		const sized = new ResizeObserver(fit);
		sized.observe(view);
		fit();

		/** Well in sight, it waits and then tours; nearly out of sight, it goes back to rest. */
		let seen = false;
		const sight = new IntersectionObserver(
			(entries) => {
				const entry = entries.at(-1);
				if (!entry) return;
				const ratio = entry.intersectionRatio;
				if (ratio < LEAVING) {
					if (seen) {
						clearTimeout(timer);
						phase = 'rest';
						stop = 0;
						grabbing = false;
						engaged = false;
						go?.(REST);
					}
					seen = false;
					return;
				}
				seen = true;
				if (ratio >= ARRIVED && phase === 'rest' && !still.matches) {
					phase = 'waiting';
					timer = setTimeout(() => {
						phase = 'touring';
						engaged = true;
						onward();
					}, WAIT);
				}
			},
			{ threshold: [LEAVING, ARRIVED] },
		);
		sight.observe(box);

		/** The pointer or the keyboard coming on stops the tour where it stands, for the reader. */
		function enter() {
			clearTimeout(timer);
			if (phase === 'waiting' || phase === 'touring') glide = undefined;
			phase = 'free';
			engaged = true;
		}
		const ray = new three.Raycaster();
		function down(event: PointerEvent) {
			glide = undefined;
			phase = 'free';
			engaged = true;
			drag = { x: event.clientX, y: event.clientY, moved: false };
			view.setPointerCapture(event.pointerId);
			grabbing = true;
		}
		const axis = new three.Vector3();
		const step = new three.Quaternion();
		/**
		 * The point held follows the pointer: the scene turns about the line square to the drag and to
		 * the view, as far as the pointer went, a degree for every few pixels.
		 */
		function move(event: PointerEvent) {
			if (!drag) return;
			const [dx, dy] = [event.clientX - drag.x, event.clientY - drag.y];
			if (!dx && !dy) return;
			drag.x = event.clientX;
			drag.y = event.clientY;
			drag.moved ||= Math.hypot(dx, dy) > 0;
			axis.set(dy, 0, -dx).normalize();
			step.setFromAxisAngle(axis, (Math.hypot(dx, dy) * TURN * Math.PI) / 180);
			turn.premultiply(step);
			kick();
		}
		function up(event: PointerEvent) {
			if (!drag) return;
			const { moved } = drag;
			drag = undefined;
			grabbing = false;
			if (!moved) copy(event);
		}
		/** A press that did not turn the view copies the ground under it. */
		function copy(event: PointerEvent) {
			const rect = view.getBoundingClientRect();
			ray.setFromCamera(
				new three.Vector2(
					((event.clientX - rect.left) / rect.width) * 2 - 1,
					-((event.clientY - rect.top) / rect.height) * 2 + 1,
				),
				camera,
			);
			const hit = ray.intersectObjects(pickable, false)[0];
			if (!hit) return;
			const { token, theme } = hit.object.userData as { token: string; theme: Theme };
			const key = `${token}:${theme}`;
			pressed = { x: event.clientX - rect.left, y: event.clientY - rect.top, key, theme };
			void ticks.copy(token, key);
		}
		box.addEventListener('pointerenter', enter);
		box.addEventListener('focusin', enter);
		view.addEventListener('pointerdown', down);
		view.addEventListener('pointermove', move);
		view.addEventListener('pointerup', up);
		view.addEventListener('pointercancel', up);

		return () => {
			cancelAnimationFrame(frame);
			sized.disconnect();
			sight.disconnect();
			clearTimeout(timer);
			go = undefined;
			box.removeEventListener('pointerenter', enter);
			box.removeEventListener('focusin', enter);
			view.removeEventListener('pointerdown', down);
			view.removeEventListener('pointermove', move);
			view.removeEventListener('pointerup', up);
			view.removeEventListener('pointercancel', up);
			for (const thing of owned) thing.dispose();
		};
	}

	const styles = stylex.create({
		host: {
			position: 'relative',
			width: '100%',
			aspectRatio: `${SCENE.width} / ${SCENE.height}`,
			containerType: 'inline-size',
		},
		canvas: {
			position: 'absolute',
			inset: 0,
			width: '100%',
			height: '100%',
			cursor: 'grab',
			touchAction: 'pan-y',
		},
		grabbing: { cursor: 'grabbing' },
		/** The plan as the scene is seen from straight above, until the scene has drawn. */
		plan: { position: 'absolute', inset: 0 },
		hidden: { visibility: 'hidden' },
		piece: {
			position: 'absolute',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
		},
		/** The views to bring it to, at the box's foot, there once the reader has turned it. */
		menu: {
			position: 'absolute',
			bottom: '0.75rem',
			left: '50%',
			display: 'flex',
			gap: '0.125rem',
			padding: '0.125rem',
			borderWidth: borderWidth.hairline,
			borderStyle: 'solid',
			borderColor: 'var(--border-default)',
			borderRadius: radius.md,
			backgroundColor: 'var(--background-surface)',
			opacity: 0,
			pointerEvents: 'none',
			transform: 'translate(-50%, 0.25rem)',
			transitionProperty: 'opacity, transform',
			transitionDuration: '200ms',
		},
		shown: { opacity: 1, pointerEvents: 'auto', transform: 'translate(-50%, 0)' },
		view: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			width: '1.75rem',
			height: '1.75rem',
			padding: 0,
			borderWidth: 0,
			borderRadius: `calc(${radius.md} - 0.125rem - ${borderWidth.hairline})`,
			backgroundColor: { default: 'transparent', ':hover': 'var(--interaction-subtle)' },
			color: 'var(--foreground-muted)',
			cursor: 'pointer',
		},
		mark: { display: 'flex' },
		chosen: {
			backgroundColor: {
				default: 'var(--interaction-muted)',
				':hover': 'var(--interaction-muted)',
			},
			color: 'var(--foreground-strong)',
		},
		tick: {
			position: 'absolute',
			transform: 'translate(-50%, -50%)',
			color: 'var(--foreground-strong)',
			pointerEvents: 'none',
		},
	});
</script>

<div bind:this={host} class={stylex.attrs(styles.host).class}>
	<div class={stylex.attrs(styles.plan, drawn && styles.hidden).class} aria-hidden="true">
		{#each SLABS as { theme, x } (theme)}
			<ThemeScope {theme}>
				{#each [{ size: PLATE, ground: 'base' }, { size: REGION, ground: 'surface' }, { size: FIELD, ground: 'base' }] as { size, ground }, index (index)}
					{@const at = placed(x, 0, size)}
					<div
						class={stylex.attrs(styles.piece).class}
						style:left={at.left}
						style:top={at.top}
						style:width={at.width}
						style:height={at.height}
						style:border-radius={across(size.radius)}
						style:background-color="var(--background-{ground})"
					></div>
				{/each}
			</ThemeScope>
		{/each}
	</div>
	<canvas
		bind:this={canvas}
		class={stylex.attrs(styles.canvas, grabbing && styles.grabbing).class}
		aria-label="The base and the surface of both themes, the surface a level above the base in each"
	></canvas>
	<div
		class={stylex.attrs(styles.menu, go && engaged && styles.shown).class}
		role="group"
		aria-label="View"
	>
		{#each VIEWS as view (view.name)}
			<Tooltip label={view.name}>
				<button
					type="button"
					aria-label={view.name}
					class={stylex.attrs(styles.view, at === view.name && styles.chosen).class}
					aria-pressed={at === view.name}
					onclick={() => go?.(view.pose)}
				>
					<span
						class={stylex.attrs(styles.mark).class}
						style:transform={'turn' in view ? view.turn : undefined}
					>
						<Icon icon={view.icon} size={16} />
					</span>
				</button>
			</Tooltip>
		{/each}
	</div>
	{#if pressed && ticks.has(pressed.key)}
		<ThemeScope theme={pressed.theme}>
			<span
				class={stylex.attrs(styles.tick).class}
				style:left="{pressed.x}px"
				style:top="{pressed.y}px"
			>
				<Icon icon={CheckIcon} size={18} stroke={3} />
			</span>
		</ThemeScope>
	{/if}
</div>
