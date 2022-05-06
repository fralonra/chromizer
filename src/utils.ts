function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const channels = [
    r.toString(16),
    g.toString(16),
    b.toString(16),
    a.toString(16),
  ];

  channels.forEach((channel, i) => {
    if (channel.length < 2) {
      channels[i] = '0' + channel;
    }
  });

  return '#' + channels.join('');
}

export { rgbaToHex };
