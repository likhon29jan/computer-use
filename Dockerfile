FROM ubuntu:20.04

# Install necessary packages
RUN apt-get update && apt-get install -y \
    x11-apps \
    xdotool \
    fluxbox \
    xvfb \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

# Set up a non-root user
RUN useradd -ms /bin/bash user
USER user
WORKDIR /home/user

# Set up the display environment
ENV DISPLAY=:99

# Run fluxbox and a virtual framebuffer
CMD ["/usr/bin/Xvfb", ":99", "-screen", "0", "1280x1024x24", "&", "fluxbox"]