/**
 * svgDebug.js — SVG diagnostic helpers for the browser console.
 *
 * Exposes window.__debugSVGs() to inspect sprite loading, <use> elements,
 * and computed styles. Import from anywhere (leaf dependency, no imports).
 */

const SPRITE_PATH = 'assets/icons/sprite.svg';

/**
 * Run all SVG diagnostics and print to console.
 * Call from devtools:  __debugSVGs()
 */
export function enableSvgDebug() {
  window.__debugSVGs = function () {
    const group = console.groupCollapsed || console.group;
    const sep = '—'.repeat(48);

    group('SVG Diagnostic Report');

    // 1. Check sprite accessibility
    console.log(sep);
    console.log('1. SPRITE FETCH TEST');
    fetch(SPRITE_PATH)
      .then((r) => {
        console.log(`   URL: ${SPRITE_PATH}`);
        console.log(`   Status: ${r.status} ${r.statusText}`);
        console.log(`   Content-Type: ${r.headers.get('Content-Type')}`);
        return r.text().then((text) => {
          console.log(`   Size: ${text.length} bytes`);
          // Check for key symbols
          const symbols = text.match(/<symbol id="([^"]+)"/g);
          if (symbols) {
            console.log(`   Symbols found: ${symbols.length}`);
            symbols.forEach((s) => console.log(`     ${s.match(/id="([^"]+)"/)[1]}`));
          }
        });
      })
      .catch((err) => {
        console.error(`   FETCH FAILED: ${err.message}`);
      });

    // 2. Find all <use> elements
    console.log(sep);
    console.log('2. ALL <use> ELEMENTS IN DOCUMENT');
    const uses = document.querySelectorAll('use');
    if (uses.length === 0) {
      console.log('   No <use> elements found.');
    } else {
      console.log(`   Found ${uses.length} <use> elements`);
      uses.forEach((u, i) => {
        const href = u.getAttribute('href') || u.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '(none)';
        const parent = u.closest('[class]')?.className || u.parentElement?.tagName || '(unknown)';
        const rect = u.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0;
        console.log(
          `   [${i}] href="${href}"  parent=<${parent}>  ` +
          `size=${rect.width.toFixed(1)}x${rect.height.toFixed(1)}  ` +
          `visible=${visible}  ` +
          `computed-vis=${getComputedStyle(u).visibility}  ` +
          `display=${getComputedStyle(u).display}`
        );
      });
    }

    // 3. Check shadow roots on <use> elements
    console.log(sep);
    console.log('3. SHADOW ROOT STATUS ON <use> ELEMENTS');
    uses.forEach((u, i) => {
      const href = u.getAttribute('href') || u.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '(none)';
      // In Chrome, closed shadow roots aren't accessible via .shadowRoot
      // We can check if the use element has rendered content via its child count
      // or check if the browser created a shadow root by checking its render size.
      const rect = u.getBoundingClientRect();
      console.log(
        `   [${i}] href="${href}"  rendered=${rect.width > 0 && rect.height > 0}  ` +
        `children=${u.children.length}  ` +
        `shadowRoot=${u.shadowRoot ? 'open' : u.shadowRoot === null ? 'null' : 'closed (expected)'}`
      );
    });

    // 4. Check the sprite container SVG
    console.log(sep);
    console.log('4. SPRITE <svg> CONTAINER (if present in DOM)');
    const sprites = document.querySelectorAll('svg[width="0"][height="0"]');
    if (sprites.length) {
      sprites.forEach((s, i) => {
        console.log(`   Found [${i}] width=0 height=0 svg, className=${s.className}`);
      });
    } else {
      console.log('   No sprite container SVG found in DOM (expected — sprite is loaded externally by <use>)');
    }

    // 5. Inspect color tokens used by SVG-consuming components
    console.log(sep);
    console.log('5. COLOR INHERITANCE CHECK');
    uses.forEach((u, i) => {
      const href = u.getAttribute('href') || u.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '(none)';
      const style = getComputedStyle(u);
      const parentStyle = u.parentElement ? getComputedStyle(u.parentElement) : null;
      const ancestorColor = u.closest('[class]') ? getComputedStyle(u.closest('[class]')).color : '(none)';
      console.log(
        `   [${i}] href="${href}"  ` +
        `use.color=${style.color}  ` +
        `use.fill=${style.fill}  ` +
        `use.stroke=${style.stroke}  ` +
        `parent.color=${parentStyle ? parentStyle.color : '(no parent)'}  ` +
        `ancestor.color=${ancestorColor}`
      );
    });

    console.log(sep);
    console.log('6. NETWORK CHECK');
    const entries = performance.getEntriesByType('resource') || [];
    const spriteEntries = entries.filter((e) => e.name.includes('sprite.svg'));
    if (spriteEntries.length) {
      spriteEntries.forEach((e) => {
        console.log(
          `   ${e.name}  status=${e.transferSize > 0 ? 'OK' : 'CACHED?'}  ` +
          `size=${e.transferSize}B  duration=${e.duration.toFixed(0)}ms`
        );
      });
    } else {
      console.log('   No sprite.svg in Performance entries (may not have loaded yet or cleared)');
    }

    console.log(sep);
    console.log('Done. Check the Network tab for sprite.svg responses.');
    console.groupEnd();
  };

  console.log(
    '%c SVG Debug %c Run __debugSVGs() in the console to check SVG sprite loading. ',
    'background:#221c14;color:#fbf6e9;font-weight:bold;padding:2px 4px;border-radius:3px 0 0 3px',
    'background:#6d4bb6;color:#fff;padding:2px 4px;border-radius:0 3px 3px 0'
  );

  // Also check on initial load — delay slightly so the game has time to render
  // Note: we don't auto-run diagnostics, just enable the helper.
}
