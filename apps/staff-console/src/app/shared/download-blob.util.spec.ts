import { downloadBlob } from './download-blob.util.js';

describe('downloadBlob', () => {
  it('creates an object URL, clicks a hidden download link, and revokes the URL', () => {
    const createObjectURLSpy = jest.fn().mockReturnValue('blob:fake-url');
    URL.createObjectURL = createObjectURLSpy;
    const revokeObjectURLSpy = jest.fn();
    URL.revokeObjectURL = revokeObjectURLSpy;
    const clickSpy = jest.fn();
    let href = '';
    let download = '';
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue({
      set href(value: string) {
        href = value;
      },
      set download(value: string) {
        download = value;
      },
      click: clickSpy,
    } as unknown as HTMLAnchorElement);
    const blob = new Blob(['a,b\n1,2'], { type: 'text/csv' });

    downloadBlob(blob, 'events.csv');

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-url');
    expect(href).toBe('blob:fake-url');
    expect(download).toBe('events.csv');

    createElementSpy.mockRestore();
  });
});
