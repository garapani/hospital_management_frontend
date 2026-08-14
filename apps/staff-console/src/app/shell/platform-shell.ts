import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ShellChrome } from './shell-chrome.js';

/**
 * Platform console shell. Its nav is unconditional: reaching this shell at all requires
 * platformGuard, and a Super Admin holds every permission, so per-entry permission checks
 * would be noise.
 */
@Component({
  imports: [RouterModule, ShellChrome],
  selector: 'hms-platform-shell',
  templateUrl: './platform-shell.html',
})
export class PlatformShell {}
