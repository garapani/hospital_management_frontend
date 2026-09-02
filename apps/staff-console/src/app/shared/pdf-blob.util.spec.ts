import { openPdfBlobInNewTab } from './pdf-blob.util.js';

describe('openPdfBlobInNewTab', () => {
  it('opens an object URL for the blob in a new tab, then revokes it after a delay', () => {
    jest.useFakeTimers();
    const createObjectURLSpy = jest.fn().mockReturnValue('blob:fake-url');
    URL.createObjectURL = createObjectURLSpy;
    const revokeObjectURLSpy = jest.fn();
    URL.revokeObjectURL = revokeObjectURLSpy;
    const openSpy = jest.spyOn(window, 'open').mockReturnValue(null);
    const blob = new Blob(['%PDF-fake'], { type: 'application/pdf' });

    openPdfBlobInNewTab(blob);

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(openSpy).toHaveBeenCalledWith('blob:fake-url', '_blank');
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();

    jest.advanceTimersByTime(10000);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-url');

    openSpy.mockRestore();
    jest.useRealTimers();
  });
});
