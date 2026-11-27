import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import StarRating from "./StarRating";
import { toast } from "sonner";

const RatingSection = ({ contentType, contentId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ratingData } = useQuery({
    queryKey: ["rating-data", contentType, contentId, user?.id],
    queryFn: async () => {
      const res = await api.ratings.get(contentId, contentType, user?.id);
      return res.data || { average: 0, count: 0, userRating: 0 };
    },
  });

  const rateMutation = useMutation({
    mutationFn: async (rating) => {
      if (!user) throw new Error("Must be logged in");
      await api.ratings.set(contentId, contentType, rating);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rating-data", contentType, contentId] });
      toast.success("Rating saved!");
    },
    onError: () => toast.error("Failed to save rating"),
  });

  const avgRating = ratingData?.average ?? 0;
  const totalRatings = ratingData?.count ?? 0;
  const userRating = ratingData?.userRating ?? 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <StarRating rating={Math.round(avgRating)} size="md" />
        <span className="text-sm font-medium text-foreground">
          {Number(avgRating).toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground">
          ({totalRatings} {totalRatings === 1 ? "rating" : "ratings"})
        </span>
      </div>

      {user ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Your rating:</span>
          <StarRating
            rating={userRating}
            interactive
            size="md"
            onRate={(r) => rateMutation.mutate(r)}
          />
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Log in to rate</span>
      )}
    </div>
  );
};

export default RatingSection;
