export function wait(timeout: number): Promise<void> {
    return new Promise((res) => setTimeout(res, timeout));
}
