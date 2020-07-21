# playground

Potential regression in yesterday's Nightly preview: https://github.com/BabylonJS/Babylon.js/commit/a6cc595d9f16fb916f88156d537c6bc426240b37

In `server/`, run `npm run launch`. Then visit http://localhost/ to view Playground.

To see the potential regression, in `index.html`, swap

```html
// Last Friday's Nightly
<script src="lib/babylon.daf12d539d756e5b873b1f68cc0a2e11cf6e1fda.js"></script>
```

with

```html
// Yesterday's Nightly
<!-- <script src="lib/babylon.js"></script> -->
```

If you would like to modify the Playground's code in `client/ts/app.ts`, run `npm run build` in `client/` to build your changes.
