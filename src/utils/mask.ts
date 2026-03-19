export function maskSecret(secret: string, visible = 4): string {
  if (secret.length <= visible) {
    return '*'.repeat(secret.length);
  }

  return `${'*'.repeat(Math.max(secret.length - visible, 0))}${secret.slice(-visible)}`;
}

export function maskBasicAuth(username: string, accessKey: string): string {
  return `${username}:${maskSecret(accessKey)}`;
}
