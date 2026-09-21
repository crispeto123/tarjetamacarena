FROM node:24-alpine
WORKDIR /app
COPY package.json model.cjs sync.cjs server.cjs pdf.cjs ./
COPY public ./public
ENV HOST=0.0.0.0 PORT=8769 DATA_DIR=/data
RUN mkdir /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8769
CMD ["node","server.cjs"]
