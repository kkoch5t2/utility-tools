export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.hostname = "utility-tools-jp.com";
    url.port = "";

    return Response.redirect(url.toString(), 301);
  },
};
