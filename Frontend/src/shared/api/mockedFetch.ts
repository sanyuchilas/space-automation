import { getCorrectionServiceUrl, getMainServiceUrl, wait } from "@/shared";

export const mockedFetch = async (url: string): Promise<Response> => {
  await wait(1000);

  switch (url) {
    case `${getMainServiceUrl()}/server_images`:
      return new Response(
        JSON.stringify({
          serverImages: [
            {
              normal:
                "https://avatars.mds.yandex.net/i?id=41be790bd24a8558ed8759e679a9cb9d_l-4614390-images-thumbs&n=13",
              corrected:
                "https://www.americamagazine.org/sites/default/files/main_image/shutterstock_242313886.jpg",
              processed:
                "https://boostyourimmunesystem.org/wp-content/uploads/2020/04/processed-food-blog-1024x727.jpg",
            },
            {
              normal:
                "https://avatars.mds.yandex.net/i?id=64ab502a9373db3527e7b051a6043585d2ea6378-6909092-images-thumbs&n=13",
              corrected: null,
              processed: null,
            },
          ],
        }),
        {
          status: 200,
        },
      );

    case `${getMainServiceUrl()}/load_image`:
      return new Response(
        JSON.stringify({
          imageUrl:
            "https://avatars.mds.yandex.net/i?id=41be790bd24a8558ed8759e679a9cb9d_l-4614390-images-thumbs&n=13",
        }),
        {
          status: 200,
        },
      );

    case `${getCorrectionServiceUrl()}/correct`:
      return new Response(
        JSON.stringify({
          path: "https://www.americamagazine.org/sites/default/files/main_image/shutterstock_242313886.jpg",
        }),
      );

    case `${getMainServiceUrl()}/segment-clouds`:
      return new Response(
        JSON.stringify({
          path: "https://boostyourimmunesystem.org/wp-content/uploads/2020/04/processed-food-blog-1024x727.jpg",
          cloud_precentage: 50,
        }),
      );

    case `${getCorrectionServiceUrl()}/last-image`:
      return new Response(
        JSON.stringify({
          path: "https://avatars.mds.yandex.net/i?id=41be790bd24a8558ed8759e679a9cb9d_l-4614390-images-thumbs&n=13",
        }),
      );

    default:
      return new Response(JSON.stringify({}), {
        status: 200,
      });
  }
};
